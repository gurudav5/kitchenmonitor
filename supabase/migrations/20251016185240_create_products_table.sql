/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (text, primary key) - Product ID from Dotykačka
      - `name` (text) - Product name
      - `category` (text) - Product category
      - `last_updated` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access (products list is not sensitive)
*/

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  category text DEFAULT '',
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (true);
