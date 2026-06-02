-- Run this in Supabase SQL Editor to create all tables

-- Products
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]',
  category TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  featured BOOLEAN DEFAULT false,
  included_items JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  delivery DECIMAL(10,2) DEFAULT 0,
  gst DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  payment_id TEXT DEFAULT '',
  gift_message TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  courier TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact messages
CREATE TABLE contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════
-- PUBLIC POLICIES (anon key — visible in browser)
-- ══════════════════════════════════════════

-- Anyone can view products and categories
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

-- Anyone can submit contact messages and subscribe to newsletter
-- (Orders use a SECURITY DEFINER function instead)
CREATE POLICY "Public insert contact" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════
-- ADMIN POLICIES (authenticated via Supabase Auth)
-- ══════════════════════════════════════════

-- Products: admin can CRUD
CREATE POLICY "Admin all products" ON products FOR ALL
  USING (auth.jwt()->>'role' = 'authenticated')
  WITH CHECK (auth.jwt()->>'role' = 'authenticated');

-- Orders: admin can read and update
CREATE POLICY "Admin read orders" ON orders FOR SELECT
  USING (auth.jwt()->>'role' = 'authenticated');
CREATE POLICY "Admin update orders" ON orders FOR UPDATE
  USING (auth.jwt()->>'role' = 'authenticated')
  WITH CHECK (auth.jwt()->>'role' = 'authenticated');

-- Categories: admin can CRUD
CREATE POLICY "Admin all categories" ON categories FOR ALL
  USING (auth.jwt()->>'role' = 'authenticated')
  WITH CHECK (auth.jwt()->>'role' = 'authenticated');

-- Newsletter: admin can read and delete
CREATE POLICY "Admin read subscribers" ON newsletter_subscribers FOR SELECT
  USING (auth.jwt()->>'role' = 'authenticated');
CREATE POLICY "Admin delete subscribers" ON newsletter_subscribers FOR DELETE
  USING (auth.jwt()->>'role' = 'authenticated');

-- Contact messages: admin can read and update
CREATE POLICY "Admin read messages" ON contact_messages FOR SELECT
  USING (auth.jwt()->>'role' = 'authenticated');
CREATE POLICY "Admin update messages" ON contact_messages FOR UPDATE
  USING (auth.jwt()->>'role' = 'authenticated')
  WITH CHECK (auth.jwt()->>'role' = 'authenticated');

-- ══════════════════════════════════════════
-- STOCK MANAGEMENT
-- ══════════════════════════════════════════

-- Function: decrement stock when order is placed
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - (item->>'quantity')::int),
      updated_at = NOW()
  FROM jsonb_array_elements(NEW.items) AS item
  WHERE products.id = (item->>'product_id')::bigint;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-decrement stock on new orders
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION decrement_stock_on_order();

-- ══════════════════════════════════════════
-- SECURE ORDER CREATION (SECURITY DEFINER)
-- ══════════════════════════════════════════

-- Function: create an order with full server-side validation
-- Runs as the owner (bypasses RLS) so anon key cannot directly insert into orders
CREATE OR REPLACE FUNCTION create_order(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_city TEXT,
  p_postal_code TEXT,
  p_items JSONB,
  p_payment_id TEXT,
  p_gift_message TEXT DEFAULT '',
  p_idempotency_key TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ref TEXT;
  v_subtotal NUMERIC := 0;
  v_delivery NUMERIC := 0;
  v_gst NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item RECORD;
  v_product RECORD;
  v_existing_order JSONB;
  v_gst_rate CONSTANT NUMERIC := 0.09;
  v_delivery_fee CONSTANT NUMERIC := 15;
  v_free_shipping_threshold CONSTANT NUMERIC := 150;
  v_result JSONB;
  v_order_id BIGINT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key != '' THEN
    SELECT jsonb_build_object(
      'idempotent', true,
      'ref', ref,
      'order_id', id
    ) INTO v_existing_order
    FROM orders
    WHERE orders.ref = p_idempotency_key;
    IF v_existing_order IS NOT NULL THEN
      RETURN v_existing_order;
    END IF;
  END IF;

  -- Validate and process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) AS item
  LOOP
    SELECT id, name, price, stock INTO v_product
    FROM products
    WHERE id = (v_item.item->>'product_id')::BIGINT;

    IF v_product.id IS NULL THEN
      RETURN jsonb_build_object('error', format('Product ID %s not found', (v_item.item->>'product_id')));
    END IF;

    IF v_product.stock < (v_item.item->>'quantity')::INT THEN
      RETURN jsonb_build_object('error', format('Insufficient stock for %s (available: %s, requested: %s)',
        v_product.name, v_product.stock, (v_item.item->>'quantity')));
    END IF;

    v_subtotal := v_subtotal + (v_product.price * (v_item.item->>'quantity')::INT);
  END LOOP;

  -- Calculate delivery fee
  IF v_subtotal >= v_free_shipping_threshold OR v_subtotal = 0 THEN
    v_delivery := 0;
  ELSE
    v_delivery := v_delivery_fee;
  END IF;

  -- Calculate GST (9% of subtotal)
  v_gst := v_subtotal * v_gst_rate;

  -- Calculate total
  v_total := v_subtotal + v_delivery + v_gst;
  v_total := ROUND(v_total, 2);

  -- Generate order reference
  v_order_ref := COALESCE(p_idempotency_key, 'ORD-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)));

  -- Insert the order
  INSERT INTO orders (
    ref, customer_name, customer_email, customer_phone,
    customer_address, city, postal_code, items,
    subtotal, total, delivery, gst, payment_status, order_status,
    payment_id, gift_message, created_at
  ) VALUES (
    v_order_ref, p_customer_name, p_customer_email, p_customer_phone,
    p_customer_address, p_city, p_postal_code, p_items,
    v_subtotal, v_total, v_delivery, v_gst,
    CASE WHEN p_payment_id != '' THEN 'paid' ELSE 'pending' END,
    'pending',
    p_payment_id, p_gift_message, NOW()
  )
  RETURNING id INTO v_order_id;

  -- Decrement stock immediately for paid orders
  IF p_payment_id != '' THEN
    UPDATE products SET
      stock = GREATEST(0, stock - (item->>'quantity')::INT),
      updated_at = NOW()
    FROM jsonb_array_elements(p_items) AS item
    WHERE products.id = (item->>'product_id')::BIGINT;
  END IF;

  -- Return success response
  RETURN jsonb_build_object(
    'idempotent', false,
    'ref', v_order_ref,
    'order_id', v_order_id,
    'total', v_total,
    'delivery', v_delivery,
    'gst', v_gst,
    'subtotal', v_subtotal
  );
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION create_order TO anon;

-- ══════════════════════════════════════════
-- ADMIN AUDIT LOG
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can read
CREATE POLICY "Admin read audit log" ON admin_audit_log FOR SELECT
  USING (auth.jwt()->>'role' = 'authenticated');

-- Anyone can insert (for tracking login attempts)
CREATE POLICY "Anon insert audit log" ON admin_audit_log FOR INSERT
  WITH CHECK (true);

-- ══════════════════════════════════════════
-- STORAGE BUCKET POLICIES
-- ══════════════════════════════════════════
-- Requires: a bucket named 'products' (or your VITE_SUPABASE_STORAGE_BUCKET)
-- Create it in Supabase Dashboard → Storage → New Bucket → Name: products → Public

-- Public can read images
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Authenticated admin can upload images
CREATE POLICY "Admin insert product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND auth.jwt()->>'role' = 'authenticated'
  );

-- Admin can delete their own uploads
CREATE POLICY "Admin delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND auth.jwt()->>'role' = 'authenticated'
  );
