-- ============================================
-- Herbaspace POS — Row Level Security (RLS) Policies
-- ============================================
-- Pastikan JWT token dari Supabase Auth dipakai untuk verifikasi user

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Fungsi untuk get current user's organization
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Fungsi untuk check apakah user adalah owner
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM organizations
    WHERE id = org_id AND owner_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS (RLS Policies)
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Owner dapat access semua data organizations mereka
CREATE POLICY "Owner can access own organizations" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Staff dapat access organization mereka
CREATE POLICY "Staff can access their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.org_id = organizations.id
      AND users.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- USERS (RLS Policies)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users dapat access user data dalam organization mereka
CREATE POLICY "Users can access users in their org" ON users
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Owner dapat manage users di organization mereka
CREATE POLICY "Owners can manage users in their org" ON users
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Manager dan Admin dapat insert/update/delete users (jika role allow)
CREATE POLICY "Managers can create users in their org" ON users
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    AND (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('owner', 'manager')
  );

-- ============================================
-- CATEGORIES (RLS Policies)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access categories in their org" ON categories
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories in their org" ON categories
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories in their org" ON categories
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- PRODUCTS (RLS Policies)
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access products in their org" ON products
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage products in their org" ON products
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products in their org" ON products
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- RAW_MATERIALS (RLS Policies)
-- ============================================
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access raw materials in their org" ON raw_materials
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage raw materials in their org" ON raw_materials
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- INVENTORY (RLS Policies)
-- ============================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access inventory in their org" ON inventory
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Hanya inventory staff yang dapat update stok
CREATE POLICY "Inventory staff can update stock" ON inventory
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('owner', 'manager', 'inventory')
    )
  );

-- ============================================
-- RECIPES (RLS Policies)
-- ============================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recipes in their org" ON recipes
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage recipes in their org" ON recipes
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- RECIPE_ITEMS (RLS Policies)
-- ============================================
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recipe items in their org" ON recipe_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_items.recipe_id
      AND r.org_id IN (
        SELECT org_id FROM users WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- CUSTOMERS (RLS Policies)
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access customers in their org" ON customers
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage customers in their org" ON customers
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- TRANSACTIONS (RLS Policies)
-- ============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access transactions in their org" ON transactions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Hanya cashier dan manager yang bisa create transactions
CREATE POLICY "Cashiers can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('owner', 'manager', 'cashier')
    )
    AND cashier_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- TRANSACTION_ITEMS (RLS Policies)
-- ============================================
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access transaction items in their org" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.org_id IN (
        SELECT org_id FROM users WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- STOCK_MOVEMENTS (RLS Policies)
-- ============================================
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access stock movements in their org" ON stock_movements
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Auto logged via trigger, read-only untuk users
CREATE POLICY "Stock movements are audit log (read-only)" ON stock_movements
  FOR INSERT WITH CHECK (false);

-- ============================================
-- EXPENSE_CATEGORIES (RLS Policies)
-- ============================================
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access expense categories in their org" ON expense_categories
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- EXPENSES (RLS Policies)
-- ============================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access expenses in their org" ON expenses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses in their org" ON expenses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
    )
    AND created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- SETTINGS (RLS Policies)
-- ============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access settings in their org" ON settings
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Hanya owner yang bisa update settings
CREATE POLICY "Only owner can update settings" ON settings
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );
