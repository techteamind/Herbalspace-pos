import "dotenv/config";
import { db } from "./index";
import {
  tenants, profiles, categories, products, units, ingredients,
  recipeItems, customers, expenseCategories, expenses, settings,
  transactions, transactionItems, payments,
} from "./schema";

async function seed() {
  console.log("🌱 Mulai seeding...");

  // Tenant
  const [tenant] = await db.insert(tenants).values({
    name: "Herbaspace Bandung",
  }).returning();
  console.log("  ✓ Tenant:", tenant!.name);

  // Settings
  await db.insert(settings).values({
    tenantId: tenant!.id,
    cafeName: "Herbaspace",
    address: "Jl. Cihampelas No. 42, Bandung",
    phone: "022-1234567",
    taxPercent: "0",
    receiptHeader: "Terima kasih atas kunjungan Anda!",
    receiptFooter: "Barang yang sudah dibeli tidak dapat dikembalikan.",
  });
  console.log("  ✓ Settings");

  // Profile (owner dummy — id harus sama dengan Supabase auth user)
  const [owner] = await db.insert(profiles).values({
    id: "00000000-0000-0000-0000-000000000001",
    tenantId: tenant!.id,
    fullName: "Admin Herbaspace",
    email: "admin@herbaspace.id",
    role: "owner",
  }).returning();
  console.log("  ✓ Profile:", owner!.fullName);

  // Categories
  const catData = [
    { name: "Madu & Propolis", sortOrder: 1 },
    { name: "Herbal Serbuk", sortOrder: 2 },
    { name: "Minyak & Essence", sortOrder: 3 },
    { name: "Kapsul & Suplemen", sortOrder: 4 },
    { name: "Teh Herbal", sortOrder: 5 },
    { name: "Perawatan Tubuh", sortOrder: 6 },
  ];
  const cats = await db.insert(categories).values(
    catData.map((c) => ({ ...c, tenantId: tenant!.id })),
  ).returning();
  console.log(`  ✓ ${cats.length} kategori`);

  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  // Units
  const unitData = [
    { code: "ml", name: "Mililiter" },
    { code: "gr", name: "Gram" },
    { code: "pcs", name: "Pieces" },
    { code: "btl", name: "Botol" },
    { code: "kg", name: "Kilogram" },
    { code: "ltr", name: "Liter" },
  ];
  const unitsResult = await db.insert(units).values(
    unitData.map((u) => ({ ...u, tenantId: tenant!.id })),
  ).returning();
  console.log(`  ✓ ${unitsResult.length} satuan`);

  const unitMap = Object.fromEntries(unitsResult.map((u) => [u.code, u.id]));

  // Products
  const prodData = [
    { name: "Madu Herbal 250ml", categoryName: "Madu & Propolis", price: "35000", costPrice: "22000", sku: "MDH-250" },
    { name: "Madu Herbal 500ml", categoryName: "Madu & Propolis", price: "65000", costPrice: "40000", sku: "MDH-500" },
    { name: "Propolis Tetes 30ml", categoryName: "Madu & Propolis", price: "85000", costPrice: "52000", sku: "PRP-030" },
    { name: "Jahe Merah Bubuk 100g", categoryName: "Herbal Serbuk", price: "30000", costPrice: "18000", sku: "JMR-100" },
    { name: "Kunyit Bubuk 100g", categoryName: "Herbal Serbuk", price: "25000", costPrice: "15000", sku: "KNY-100" },
    { name: "Temulawak Bubuk 100g", categoryName: "Herbal Serbuk", price: "28000", costPrice: "16000", sku: "TLW-100" },
    { name: "Minyak Kayu Putih 60ml", categoryName: "Minyak & Essence", price: "32000", costPrice: "20000", sku: "MKP-060" },
    { name: "Minyak Zaitun 100ml", categoryName: "Minyak & Essence", price: "45000", costPrice: "28000", sku: "MZT-100" },
    { name: "Minyak Habbatussauda 60ml", categoryName: "Minyak & Essence", price: "55000", costPrice: "35000", sku: "MHS-060" },
    { name: "Habatussauda 120 Kapsul", categoryName: "Kapsul & Suplemen", price: "48000", costPrice: "30000", sku: "HBS-120" },
    { name: "Temulawak Kapsul 60s", categoryName: "Kapsul & Suplemen", price: "35000", costPrice: "20000", sku: "TLK-060" },
    { name: "Spirulina 100 Kapsul", categoryName: "Kapsul & Suplemen", price: "75000", costPrice: "48000", sku: "SPR-100" },
    { name: "Teh Daun Kelor 25 Sachet", categoryName: "Teh Herbal", price: "22000", costPrice: "12000", sku: "TDK-025" },
    { name: "Teh Rosella 20 Sachet", categoryName: "Teh Herbal", price: "20000", costPrice: "11000", sku: "TRS-020" },
    { name: "Sabun Madu 100g", categoryName: "Perawatan Tubuh", price: "18000", costPrice: "10000", sku: "SBM-100" },
    { name: "Lulur Herbal 200g", categoryName: "Perawatan Tubuh", price: "38000", costPrice: "22000", sku: "LLH-200" },
  ];
  const prods = await db.insert(products).values(
    prodData.map((p) => ({
      tenantId: tenant!.id,
      categoryId: catMap[p.categoryName]!,
      name: p.name,
      price: p.price,
      costPrice: p.costPrice,
      sku: p.sku,
    })),
  ).returning();
  console.log(`  ✓ ${prods.length} produk`);

  // Ingredients (bahan baku)
  const ingData = [
    { name: "Madu Murni", unitCode: "ltr", currentStock: "5.000", minStock: "2.000", lastCost: "120000" },
    { name: "Propolis Ekstrak", unitCode: "ml", currentStock: "500.000", minStock: "200.000", lastCost: "800" },
    { name: "Jahe Merah Kering", unitCode: "kg", currentStock: "3.000", minStock: "1.000", lastCost: "85000" },
    { name: "Kunyit Kering", unitCode: "kg", currentStock: "2.500", minStock: "1.000", lastCost: "65000" },
    { name: "Temulawak Kering", unitCode: "kg", currentStock: "2.000", minStock: "1.000", lastCost: "75000" },
    { name: "Minyak Kayu Putih Bulk", unitCode: "ltr", currentStock: "1.500", minStock: "1.000", lastCost: "180000" },
    { name: "Minyak Zaitun Bulk", unitCode: "ltr", currentStock: "2.000", minStock: "1.000", lastCost: "250000" },
    { name: "Biji Habbatussauda", unitCode: "kg", currentStock: "1.000", minStock: "0.500", lastCost: "200000" },
    { name: "Cangkang Kapsul Kosong", unitCode: "pcs", currentStock: "800.000", minStock: "500.000", lastCost: "50" },
    { name: "Daun Kelor Kering", unitCode: "kg", currentStock: "0.800", minStock: "1.000", lastCost: "95000" },
    { name: "Bunga Rosella Kering", unitCode: "kg", currentStock: "0.400", minStock: "0.500", lastCost: "150000" },
    { name: "Botol 250ml", unitCode: "pcs", currentStock: "45.000", minStock: "50.000", lastCost: "2500" },
    { name: "Botol 500ml", unitCode: "pcs", currentStock: "30.000", minStock: "25.000", lastCost: "3500" },
    { name: "Sachet Teh Filter", unitCode: "pcs", currentStock: "350.000", minStock: "200.000", lastCost: "150" },
  ];
  const ings = await db.insert(ingredients).values(
    ingData.map((i) => ({
      tenantId: tenant!.id,
      unitId: unitMap[i.unitCode]!,
      name: i.name,
      currentStock: i.currentStock,
      minStock: i.minStock,
      lastCost: i.lastCost,
    })),
  ).returning();
  console.log(`  ✓ ${ings.length} bahan baku`);

  const ingMap = Object.fromEntries(ings.map((i) => [i.name, i.id]));
  const prodMap = Object.fromEntries(prods.map((p) => [p.name, p.id]));

  // Recipe items (BOM) — contoh beberapa produk
  const recipes = [
    { product: "Madu Herbal 250ml", ingredient: "Madu Murni", qty: "0.250" },
    { product: "Madu Herbal 250ml", ingredient: "Botol 250ml", qty: "1.000" },
    { product: "Madu Herbal 500ml", ingredient: "Madu Murni", qty: "0.500" },
    { product: "Madu Herbal 500ml", ingredient: "Botol 500ml", qty: "1.000" },
    { product: "Propolis Tetes 30ml", ingredient: "Propolis Ekstrak", qty: "30.000" },
    { product: "Jahe Merah Bubuk 100g", ingredient: "Jahe Merah Kering", qty: "0.100" },
    { product: "Kunyit Bubuk 100g", ingredient: "Kunyit Kering", qty: "0.100" },
    { product: "Temulawak Bubuk 100g", ingredient: "Temulawak Kering", qty: "0.100" },
    { product: "Habatussauda 120 Kapsul", ingredient: "Biji Habbatussauda", qty: "0.060" },
    { product: "Habatussauda 120 Kapsul", ingredient: "Cangkang Kapsul Kosong", qty: "120.000" },
    { product: "Teh Daun Kelor 25 Sachet", ingredient: "Daun Kelor Kering", qty: "0.050" },
    { product: "Teh Daun Kelor 25 Sachet", ingredient: "Sachet Teh Filter", qty: "25.000" },
    { product: "Teh Rosella 20 Sachet", ingredient: "Bunga Rosella Kering", qty: "0.040" },
    { product: "Teh Rosella 20 Sachet", ingredient: "Sachet Teh Filter", qty: "20.000" },
  ];
  await db.insert(recipeItems).values(
    recipes.map((r) => ({
      tenantId: tenant!.id,
      productId: prodMap[r.product]!,
      ingredientId: ingMap[r.ingredient]!,
      quantity: r.qty,
    })),
  );
  console.log(`  ✓ ${recipes.length} resep`);

  // Customers
  const custData = [
    { name: "Ibu Rani", phone: "081234567890", email: "rani@email.com" },
    { name: "Pak Budi", phone: "081234567891" },
    { name: "Siti Aminah", phone: "081234567892", email: "siti@email.com" },
    { name: "Hendra Wijaya", phone: "081234567893" },
    { name: "Dewi Sartika", phone: "081234567894", email: "dewi@email.com" },
  ];
  const custs = await db.insert(customers).values(
    custData.map((c) => ({ ...c, tenantId: tenant!.id, email: c.email ?? null })),
  ).returning();
  console.log(`  ✓ ${custs.length} pelanggan`);

  // Expense Categories
  const expCatData = ["Sewa Tempat", "Gaji Karyawan", "Listrik & Air", "Bahan Baku", "Transportasi", "Lainnya"];
  const expCats = await db.insert(expenseCategories).values(
    expCatData.map((name) => ({ name, tenantId: tenant!.id })),
  ).returning();
  console.log(`  ✓ ${expCats.length} kategori pengeluaran`);

  const expCatMap = Object.fromEntries(expCats.map((c) => [c.name, c.id]));

  // Expenses (sample)
  const today = new Date();
  const expenseData = [
    { cat: "Listrik & Air", desc: "Tagihan listrik Juni", amount: "850000", daysAgo: 2 },
    { cat: "Transportasi", desc: "Kirim barang ke pelanggan", amount: "75000", daysAgo: 1 },
    { cat: "Bahan Baku", desc: "Beli madu murni 5 liter", amount: "600000", daysAgo: 3 },
    { cat: "Lainnya", desc: "Perlengkapan kebersihan", amount: "120000", daysAgo: 0 },
  ];
  for (const e of expenseData) {
    const spentAt = new Date(today);
    spentAt.setDate(spentAt.getDate() - e.daysAgo);
    await db.insert(expenses).values({
      tenantId: tenant!.id,
      categoryId: expCatMap[e.cat]!,
      description: e.desc,
      amount: e.amount,
      spentAt,
      createdBy: owner!.id,
    });
  }
  console.log(`  ✓ ${expenseData.length} pengeluaran`);

  // Sample transactions (hari ini)
  const sampleTrx = [
    {
      customer: custs[0]!.id, items: [
        { prod: "Madu Herbal 250ml", qty: 2, price: 35000 },
        { prod: "Jahe Merah Bubuk 100g", qty: 1, price: 30000 },
      ],
      payMethod: "cash" as const, minutesAgo: 180,
    },
    {
      customer: null, items: [
        { prod: "Habatussauda 120 Kapsul", qty: 1, price: 48000 },
        { prod: "Minyak Zaitun 100ml", qty: 2, price: 45000 },
      ],
      payMethod: "qris" as const, minutesAgo: 120,
    },
    {
      customer: custs[1]!.id, items: [
        { prod: "Propolis Tetes 30ml", qty: 1, price: 85000 },
        { prod: "Teh Daun Kelor 25 Sachet", qty: 3, price: 22000 },
        { prod: "Sabun Madu 100g", qty: 2, price: 18000 },
      ],
      payMethod: "cash" as const, minutesAgo: 90,
    },
    {
      customer: custs[2]!.id, items: [
        { prod: "Madu Herbal 500ml", qty: 1, price: 65000 },
      ],
      payMethod: "transfer" as const, minutesAgo: 45,
    },
    {
      customer: null, items: [
        { prod: "Spirulina 100 Kapsul", qty: 1, price: 75000 },
        { prod: "Lulur Herbal 200g", qty: 1, price: 38000 },
      ],
      payMethod: "qris" as const, minutesAgo: 15,
    },
  ];

  for (let i = 0; i < sampleTrx.length; i++) {
    const t = sampleTrx[i]!;
    const createdAt = new Date(today);
    createdAt.setMinutes(createdAt.getMinutes() - t.minutesAgo);
    const subtotal = t.items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const number = `TRX-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`;

    const [trx] = await db.insert(transactions).values({
      tenantId: tenant!.id,
      number,
      customerId: t.customer,
      cashierId: owner!.id,
      status: "paid",
      subtotal: String(subtotal),
      total: String(subtotal),
      cogsTotal: "0",
      paidAt: createdAt,
      createdAt,
    }).returning();

    for (const item of t.items) {
      await db.insert(transactionItems).values({
        tenantId: tenant!.id,
        transactionId: trx!.id,
        productId: prodMap[item.prod]!,
        productName: item.prod,
        quantity: item.qty,
        unitPrice: String(item.price),
        lineTotal: String(item.price * item.qty),
      });
    }

    await db.insert(payments).values({
      tenantId: tenant!.id,
      transactionId: trx!.id,
      method: t.payMethod,
      amount: String(subtotal),
      amountReceived: t.payMethod === "cash" ? String(subtotal + 5000) : null,
      changeAmount: t.payMethod === "cash" ? "5000" : "0",
      createdAt,
    });
  }
  console.log(`  ✓ ${sampleTrx.length} transaksi`);

  console.log("\n✅ Seeding selesai!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding gagal:", err);
  process.exit(1);
});
