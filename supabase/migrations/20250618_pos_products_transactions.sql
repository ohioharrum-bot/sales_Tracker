-- POS inventory and transaction tables (run in Supabase SQL editor)

CREATE TABLE IF NOT EXISTS pos_products (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  cat TEXT NOT NULL DEFAULT 'Other',
  quick BOOLEAN NOT NULL DEFAULT false,
  taxable BOOLEAN NOT NULL DEFAULT true,
  reorder INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, barcode)
);

CREATE TABLE IF NOT EXISTS pos_transactions (
  id TEXT PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ts BIGINT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pos_transactions_store_ts_idx ON pos_transactions (store_id, ts DESC);

ALTER TABLE pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_products_store_owner" ON pos_products
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "pos_transactions_store_owner" ON pos_transactions
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
