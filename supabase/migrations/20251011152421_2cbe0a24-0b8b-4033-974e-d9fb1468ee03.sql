-- Add alert_email column to system_config table
ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS alert_email TEXT DEFAULT 'admin@company.com';