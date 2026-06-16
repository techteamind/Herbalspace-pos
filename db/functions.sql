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
CREATE OR REPLACE FUNCTION create_sale(
  p_tenant_id   uuid,
  p_cashier_id  uuid,
  p_customer_id uuid,
  p_discount    numeric,
  p_tax_percent numeric,
  p_items       jsonb,
  p_payments    jsonb
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
  v_total        numeric(14,2) := 0;
  v_item         jsonb;
  v_pay          jsonb;
  v_unit_cogs    numeric(14,2);
  v_line_total   numeric(14,2);
  v_qty          int;
  v_product_id   uuid;
  r_recipe       record;
  v_new_balance  numeric(14,3);
BEGIN
  -- nomor struk harian: TRX-YYYYMMDD-####
  SELECT COUNT(*) + 1 INTO v_seq
  FROM transactions
  WHERE tenant_id = p_tenant_id
    AND created_at::date = CURRENT_DATE;
  v_number := 'TRX-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  -- header sementara (total diisi setelah loop)
  INSERT INTO transactions (id, tenant_id, number, customer_id, cashier_id, status,
                            subtotal, discount, tax_amount, total, cogs_total)
  VALUES (v_tx_id, p_tenant_id, v_number, p_customer_id, p_cashier_id, 'paid',
          0, COALESCE(p_discount,0), 0, 0, 0);

  -- proses tiap item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_line_total := (v_item->>'unit_price')::numeric * v_qty;

    -- HPP per unit = total (qty bahan × last_cost) dari resep
    SELECT COALESCE(SUM(ri.quantity * i.last_cost), 0)::numeric(14,2)
      INTO v_unit_cogs
    FROM recipe_items ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.product_id = v_product_id;

    INSERT INTO transaction_items (tenant_id, transaction_id, product_id, product_name,
                                   quantity, unit_price, unit_cogs, line_total)
    VALUES (p_tenant_id, v_tx_id, v_product_id, v_item->>'product_name',
            v_qty, (v_item->>'unit_price')::numeric, v_unit_cogs, v_line_total);

    v_subtotal   := v_subtotal + v_line_total;
    v_cogs_total := v_cogs_total + (v_unit_cogs * v_qty);

    -- potong stok bahan sesuai resep × qty, catat movement
    FOR r_recipe IN
      SELECT ri.ingredient_id, ri.quantity, i.last_cost
      FROM recipe_items ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.product_id = v_product_id
    LOOP
      UPDATE ingredients
        SET current_stock = current_stock - (r_recipe.quantity * v_qty)
        WHERE id = r_recipe.ingredient_id
        RETURNING current_stock INTO v_new_balance;

      INSERT INTO stock_movements (tenant_id, ingredient_id, type, qty_change,
                                   balance_after, unit_cost, reference_type, reference_id,
                                   created_by)
      VALUES (p_tenant_id, r_recipe.ingredient_id, 'sale',
              -(r_recipe.quantity * v_qty), v_new_balance, r_recipe.last_cost,
              'transaction', v_tx_id, p_cashier_id);
    END LOOP;
  END LOOP;

  -- pajak & total
  v_tax   := round((v_subtotal - COALESCE(p_discount,0)) * COALESCE(p_tax_percent,0) / 100.0, 2);
  v_total := v_subtotal - COALESCE(p_discount,0) + v_tax;

  UPDATE transactions
    SET subtotal = v_subtotal, tax_amount = v_tax, total = v_total, cogs_total = v_cogs_total
    WHERE id = v_tx_id;

  -- pembayaran
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (tenant_id, transaction_id, method, amount, amount_received, change_amount)
    VALUES (p_tenant_id, v_tx_id, (v_pay->>'method')::payment_method,
            (v_pay->>'amount')::numeric,
            NULLIF(v_pay->>'amount_received','')::numeric,
            COALESCE(NULLIF(v_pay->>'change_amount','')::numeric, 0));
  END LOOP;

  RETURN QUERY SELECT v_tx_id, v_number, v_total, v_cogs_total;
END;
$$;
