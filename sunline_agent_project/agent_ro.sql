-- Least-privilege role for the SUNLINE agent
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_ro') THEN
  CREATE ROLE agent_ro LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
END IF; END $$;
ALTER ROLE agent_ro PASSWORD :'agent_pw';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM agent_ro;
GRANT USAGE ON SCHEMA public TO agent_ro;
GRANT SELECT (id, order_number, user_id, status, payment_method, payment_status, subtotal, delivery_fee, total, phone, city, governorate, created_at) ON orders TO agent_ro;
GRANT SELECT (id, order_id, product_variant_id, product_name, color, size, unit_price, quantity) ON order_items TO agent_ro;
GRANT SELECT (id, name, description, fit, base_price, is_active) ON products TO agent_ro;
GRANT SELECT (id, product_id, color, size, stock_quantity, price_override) ON product_variants TO agent_ro;
