-- =====================================================================
-- Herbaspace POS — Business Functions (jalankan SETELAH drizzle migrate)
-- Berisi fungsi atomik untuk transaksi penjualan.
-- Dijalankan via: psql "$POSTGRES_URL" -f db/functions.sql
-- =====================================================================

-- create_sale: membuat transaksi penjualan secara ATOMIK.
--   * hitung HPP (COGS) per item dari resep × harga bahan terakhir
--   * insert transaction + items + payments
--   * potong stok bahan baku sesuai resep × qty
--   * catat setiap perubahan ke stock_movements
-- Mengembalikan: (transaction_id, number, total, cogs_total)
--
-- Parameter p_items: jsonb array of
--   { "product_id": uuid, "product_name": text, "quantity": int, "unit_price": numeric }
-- Parameter p_payments: jsonb array of
--   { "method": text, "amount": numeric, "amount_received": numeric, "change_amount": numeric }
-- Buang overload lama (9-arg & 10-arg) supaya hanya ada SATU create_sale.
-- p_occurred_at ditambah DEFAULT NULL sebagai param terakhir → panggilan 10-arg
-- lama tetap cocok (pakai default), jadi urutan deploy DB vs app tak masalah.
DROP FUNCTION IF EXISTS create_sale(uuid,uuid,uuid,numeric,numeric,jsonb,jsonb,uuid,uuid);
DROP FUNCTION IF EXISTS create_sale(uuid,uuid,uuid,numeric,numeric,jsonb,jsonb,uuid,uuid,numeric);

CREATE OR REPLACE FUNCTION create_sale(
  p_tenant_id   uuid,
  p_cashier_id  uuid,
  p_customer_id uuid,
  p_discount    numeric,
  p_tax_percent numeric,
  p_items       jsonb,
  p_payments    jsonb,
  p_outlet_id   uuid DEFAULT NULL,
  p_client_ref  uuid DEFAULT NULL,
  p_service_charge_percent numeric DEFAULT 0,
  p_occurred_at timestamptz DEFAULT NULL
)
RETURNS TABLE (transaction_id uuid, number text, total numeric, cogs_total numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_id        uuid := gen_random_uuid();
  v_number       text;
  v_seq          int;
  v_subtotal     numeric(14,2) := 0;
  v_cogs_total   numeric(14,2) := 0;
  v_tax          numeric(14,2) := 0;
  v_service      numeric(14,2) := 0;
  v_total        numeric(14,2) := 0;
  v_item         jsonb;
  v_pay          jsonb;
  v_unit_cogs    numeric(14,2);
  v_line_total   numeric(14,2);
  v_qty          int;
  v_product_id   uuid;
  v_variant_id   uuid;
  r_recipe       record;
  v_new_balance  numeric(14,3);
  v_created      timestamptz;
  v_day          date;
BEGIN
  -- serialisasi per-tenant: mencegah nomor struk duplikat saat concurrent
  -- (lock lepas otomatis saat commit/rollback)
  PERFORM pg_advisory_xact_lock(hashtext('create_sale:' || p_tenant_id::text));

  -- idempotency: replay dengan client_ref yang sama mengembalikan transaksi
  -- yang sudah ada, bukan membuat duplikat (aman untuk retry offline queue)
  IF p_client_ref IS NOT NULL THEN
    RETURN QUERY SELECT t.id, t.number, t.total, t.cogs_total
    FROM transactions t
    WHERE t.tenant_id = p_tenant_id AND t.client_ref = p_client_ref;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- waktu transaksi: pakai p_occurred_at (penjualan offline dicatat di jam JUAL,
  -- bukan jam sync). Fallback now(). Hari dihitung dalam WIB.
  v_created := COALESCE(p_occurred_at, now());
  v_day     := (v_created AT TIME ZONE 'Asia/Jakarta')::date;

  -- nomor struk harian (batas hari WIB): TRX-YYYYMMDD-####
  SELECT COUNT(*) + 1 INTO v_seq
  FROM transactions
  WHERE tenant_id = p_tenant_id
    AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = v_day;
  v_number := 'TRX-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  -- header sementara (total diisi setelah loop); created_at eksplisit = jam jual
  INSERT INTO transactions (id, tenant_id, outlet_id, number, customer_id, cashier_id, status,
                            subtotal, discount, tax_amount, total, cogs_total, client_ref, created_at)
  VALUES (v_tx_id, p_tenant_id, p_outlet_id, v_number, p_customer_id, p_cashier_id, 'paid',
          0, COALESCE(p_discount,0), 0, 0, 0, p_client_ref, v_created);

  -- proses tiap item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := NULLIF(v_item->>'variant_id', '')::uuid;
    v_qty        := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Kuantitas item tidak valid: %', v_qty;
    END IF;
    IF (v_item->>'unit_price')::numeric < 0 THEN
      RAISE EXCEPTION 'Harga item tidak valid';
    END IF;

    -- Isolasi tenant: produk (& varian, jika ada) WAJIB milik tenant ini,
    -- supaya sale tak bisa mengurangi stok/menyentuh data tenant lain.
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_product_id AND tenant_id = p_tenant_id) THEN
      RAISE EXCEPTION 'Produk bukan milik tenant ini';
    END IF;
    IF v_variant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM product_variants pv WHERE pv.id = v_variant_id AND pv.product_id = v_product_id
    ) THEN
      RAISE EXCEPTION 'Varian tidak cocok dengan produk';
    END IF;

    v_line_total := (v_item->>'unit_price')::numeric * v_qty;

    -- HPP per unit = total (qty bahan × last_cost) dari resep
    SELECT COALESCE(SUM(ri.quantity * i.last_cost), 0)::numeric(14,2)
      INTO v_unit_cogs
    FROM recipe_items ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.product_id = v_product_id;

    -- Retail barang jadi (tanpa resep): pakai HPP/harga modal yang diisi langsung
    -- di produk (atau varian). Kalau ada resep, HPP dari resep tetap dipakai.
    IF NOT EXISTS (SELECT 1 FROM recipe_items ri WHERE ri.product_id = v_product_id) THEN
      SELECT COALESCE(NULLIF(pv.cost_price, 0), p.cost_price, 0)::numeric(14,2)
        INTO v_unit_cogs
      FROM products p
      LEFT JOIN product_variants pv ON pv.id = v_variant_id
      WHERE p.id = v_product_id;
    END IF;

    INSERT INTO transaction_items (tenant_id, transaction_id, product_id, variant_id, product_name,
                                   quantity, unit_price, unit_cogs, line_total, note)
    VALUES (p_tenant_id, v_tx_id, v_product_id, v_variant_id, v_item->>'product_name',
            v_qty, (v_item->>'unit_price')::numeric, v_unit_cogs, v_line_total,
            NULLIF(v_item->>'note', ''));

    v_subtotal   := v_subtotal + v_line_total;
    v_cogs_total := v_cogs_total + (v_unit_cogs * v_qty);

    -- potong stok barang jadi (hanya kalau dilacak / stock IS NOT NULL). Varian
    -- diutamakan; kalau tak ada varian, potong stok produk. Overselling dibiarkan.
    IF v_variant_id IS NOT NULL THEN
      UPDATE product_variants SET stock = stock - v_qty WHERE id = v_variant_id AND tenant_id = p_tenant_id AND stock IS NOT NULL;
    ELSE
      UPDATE products SET stock = stock - v_qty WHERE id = v_product_id AND tenant_id = p_tenant_id AND stock IS NOT NULL;
    END IF;

    -- potong stok bahan sesuai resep × qty, catat movement
    FOR r_recipe IN
      SELECT ri.ingredient_id, ri.quantity, i.last_cost
      FROM recipe_items ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.product_id = v_product_id
    LOOP
      UPDATE ingredients
        SET current_stock = current_stock - (r_recipe.quantity * v_qty)
        WHERE id = r_recipe.ingredient_id AND tenant_id = p_tenant_id
        RETURNING current_stock INTO v_new_balance;

      INSERT INTO stock_movements (tenant_id, ingredient_id, type, qty_change,
                                   balance_after, unit_cost, ref_type, reference_id,
                                   created_by)
      VALUES (p_tenant_id, r_recipe.ingredient_id, 'sale',
              -(r_recipe.quantity * v_qty), v_new_balance, r_recipe.last_cost,
              'transaction'::reference_type, v_tx_id, p_cashier_id);
    END LOOP;
  END LOOP;

  -- pajak, service charge & total (bulat ke rupiah utuh, konsisten dengan klien)
  v_tax     := round((v_subtotal - COALESCE(p_discount,0)) * COALESCE(p_tax_percent,0) / 100.0, 0);
  v_service := round((v_subtotal - COALESCE(p_discount,0)) * COALESCE(p_service_charge_percent,0) / 100.0, 0);
  v_total   := v_subtotal - COALESCE(p_discount,0) + v_tax + v_service;

  IF v_total < 0 THEN
    RAISE EXCEPTION 'Total transaksi negatif (diskon melebihi subtotal)';
  END IF;

  UPDATE transactions
    SET subtotal = v_subtotal, tax_amount = v_tax, service_charge = v_service,
        total = v_total, cogs_total = v_cogs_total
    WHERE id = v_tx_id;

  -- pembayaran: status 'paid' hanya sah jika jumlah pembayaran menutup total
  IF (SELECT COALESCE(SUM((x->>'amount')::numeric), 0)
      FROM jsonb_array_elements(p_payments) x) < v_total THEN
    RAISE EXCEPTION 'Pembayaran kurang dari total transaksi';
  END IF;

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (tenant_id, transaction_id, method, amount, amount_received, change_amount)
    VALUES (p_tenant_id, v_tx_id, (v_pay->>'method')::payment_method,
            (v_pay->>'amount')::numeric,
            NULLIF(v_pay->>'amount_received','')::numeric,
            COALESCE(NULLIF(v_pay->>'change_amount','')::numeric, 0));
  END LOOP;

  -- poin & total belanja pelanggan (atomik bersama transaksi; void tinggal membalik)
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
      SET points = points + floor(v_total / 10000)::int,
          total_spent = total_spent + v_total
      WHERE id = p_customer_id AND tenant_id = p_tenant_id;
  END IF;

  RETURN QUERY SELECT v_tx_id, v_number, v_total, v_cogs_total;
END;
$$;
