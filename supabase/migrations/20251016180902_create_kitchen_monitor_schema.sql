/*
  # Vytvoření schématu pro kuchyňský monitor systém
  
  1. Nové tabulky
    - `orders` - objednávky z Dotykačky
      - `id` (text, PK) - ID objednávky
      - `created` (timestamp) - čas vytvoření
      - `note` (text) - poznámka
      - `table_name` (text) - název stolu
      - `delivery_service` (text) - služba doručení (wolt/foodora/bolt)
      - `delivery_note` (text) - poznámka k doručení
      - `last_updated` (timestamp) - poslední aktualizace
      
    - `order_items` - položky objednávek
      - `id` (text, PK) - ID položky
      - `order_id` (text, FK) - reference na objednávku
      - `product_id` (text) - ID produktu
      - `name` (text) - název položky
      - `quantity` (integer) - množství
      - `kitchen_status` (text) - stav (new/in-progress/completed/passed/reordered)
      - `note` (text) - poznámka
      - `shown` (boolean) - zda byla položka zobrazena
      - `last_updated` (timestamp) - poslední aktualizace
      
    - `order_item_subitems` - podpoložky (přizpůsobení)
      - `id` (uuid, PK) - primární klíč
      - `order_item_id` (text, FK) - reference na order_items
      - `name` (text) - název podpoložky
      - `quantity` (integer) - množství
      
    - `excluded_products` - vyloučené produkty (pouze pro bar)
      - `product_id` (text, PK) - ID produktu
      
    - `order_timing` - sledování časů objednávek
      - `order_id` (text, PK) - ID objednávky
      - `table_name` (text) - název stolu
      - `delivery_service` (text) - služba doručení
      - `created_at` (timestamp) - čas vytvoření
      - `first_item_started` (timestamp) - čas zahájení první položky
      - `all_items_completed` (timestamp) - čas dokončení všech položek
      - `passed_at` (timestamp) - čas předání
      - `total_items` (integer) - celkový počet položek
      - `preparation_time` (integer) - čas přípravy v sekundách
      - `total_time` (integer) - celkový čas v sekundách
      - `waiting_time` (integer) - čas čekání v sekundách
      - `status` (text) - stav (active/completed/warning/archived)
      - `warning_reason` (text) - důvod varování
      
    - `item_timing` - sledování časů jednotlivých položek
      - `id` (uuid, PK) - primární klíč
      - `order_id` (text) - ID objednávky
      - `item_id` (text) - ID položky
      - `item_name` (text) - název položky
      - `product_id` (text) - ID produktu
      - `quantity` (integer) - množství
      - `note` (text) - poznámka
      - `created_at` (timestamp) - čas vytvoření
      - `started_at` (timestamp) - čas zahájení
      - `completed_at` (timestamp) - čas dokončení
      - `waiting_time` (integer) - čas čekání v sekundách
      - `preparation_time` (integer) - čas přípravy v sekundách
      - `total_time` (integer) - celkový čas v sekundách
      - `final_status` (text) - finální stav
      
    - `item_stats` - statistiky položek
      - `item_name` (text, PK) - název položky
      - `product_id` (text) - ID produktu
      - `total_orders` (integer) - celkový počet objednávek
      - `avg_preparation_time` (real) - průměrný čas přípravy
      - `min_preparation_time` (integer) - minimální čas přípravy
      - `max_preparation_time` (integer) - maximální čas přípravy
      
    - `daily_stats` - denní statistiky
      - `date` (date, PK) - datum
      - `total_orders` (integer) - celkový počet objednávek
      - `completed_orders` (integer) - dokončené objednávky
      - `warning_orders` (integer) - výstražné objednávky
      - `avg_preparation_time` (real) - průměrný čas přípravy
      - `avg_total_time` (real) - průměrný celkový čas
      - `max_preparation_time` (integer) - maximální čas přípravy
      - `orders_under_15min` (integer) - objednávky do 15 minut
      - `orders_15_30min` (integer) - objednávky 15-30 minut
      - `orders_over_30min` (integer) - objednávky nad 30 minut
      
    - `stats_users` - uživatelé pro statistiky
      - `id` (uuid, PK) - primární klíč
      - `username` (text, unique) - uživatelské jméno
      - `password_hash` (text) - hash hesla
      - `role` (text) - role (admin/viewer)
      - `last_login` (timestamp) - poslední přihlášení
      
  2. Bezpečnost
    - Povolit všechny operace pro anonym (pro zjednodušení, v produkci by měla být RLS)
*/

-- Vytvoření tabulky orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created TIMESTAMPTZ DEFAULT NOW(),
  note TEXT DEFAULT '',
  table_name TEXT DEFAULT '',
  delivery_service TEXT DEFAULT '',
  delivery_note TEXT DEFAULT '',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Vytvoření tabulky order_items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  kitchen_status TEXT NOT NULL DEFAULT 'new',
  note TEXT DEFAULT '',
  shown BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Vytvoření indexů pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_status ON order_items(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Vytvoření tabulky order_item_subitems
CREATE TABLE IF NOT EXISTS order_item_subitems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_order_item_subitems_order_item_id ON order_item_subitems(order_item_id);

-- Vytvoření tabulky excluded_products
CREATE TABLE IF NOT EXISTS excluded_products (
  product_id TEXT PRIMARY KEY
);

-- Vytvoření tabulky order_timing
CREATE TABLE IF NOT EXISTS order_timing (
  order_id TEXT PRIMARY KEY,
  table_name TEXT DEFAULT '',
  delivery_service TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_item_started TIMESTAMPTZ,
  all_items_completed TIMESTAMPTZ,
  passed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  preparation_time INTEGER,
  total_time INTEGER,
  waiting_time INTEGER,
  status TEXT DEFAULT 'active',
  warning_reason TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_order_timing_status ON order_timing(status);
CREATE INDEX IF NOT EXISTS idx_order_timing_created_at ON order_timing(created_at);

-- Vytvoření tabulky item_timing
CREATE TABLE IF NOT EXISTS item_timing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT '',
  product_id TEXT,
  quantity INTEGER DEFAULT 1,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  waiting_time INTEGER,
  preparation_time INTEGER,
  total_time INTEGER,
  final_status TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_item_timing_order_id ON item_timing(order_id);
CREATE INDEX IF NOT EXISTS idx_item_timing_item_id ON item_timing(item_id);

-- Vytvoření tabulky item_stats
CREATE TABLE IF NOT EXISTS item_stats (
  item_name TEXT PRIMARY KEY,
  product_id TEXT,
  total_orders INTEGER DEFAULT 0,
  avg_preparation_time REAL DEFAULT 0,
  min_preparation_time INTEGER,
  max_preparation_time INTEGER
);

-- Vytvoření tabulky daily_stats
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  warning_orders INTEGER DEFAULT 0,
  avg_preparation_time REAL DEFAULT 0,
  avg_total_time REAL DEFAULT 0,
  max_preparation_time INTEGER DEFAULT 0,
  orders_under_15min INTEGER DEFAULT 0,
  orders_15_30min INTEGER DEFAULT 0,
  orders_over_30min INTEGER DEFAULT 0
);

-- Vytvoření tabulky stats_users
CREATE TABLE IF NOT EXISTS stats_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vytvoření demo uživatele (heslo: admin123)
INSERT INTO stats_users (username, password_hash, role) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Povolení RLS na všech tabulkách
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_subitems ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_users ENABLE ROW LEVEL SECURITY;

-- Vytvoření policies pro veřejný přístup (pro zjednodušení)
-- V produkci by měly být policies restriktivnější
CREATE POLICY "Allow all access to orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order_item_subitems"
  ON order_item_subitems FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to excluded_products"
  ON excluded_products FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order_timing"
  ON order_timing FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to item_timing"
  ON item_timing FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to item_stats"
  ON item_stats FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to daily_stats"
  ON daily_stats FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read access to stats_users"
  ON stats_users FOR SELECT
  USING (true);

CREATE POLICY "Allow insert access to stats_users"
  ON stats_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update access to stats_users"
  ON stats_users FOR UPDATE
  USING (true)
  WITH CHECK (true);
