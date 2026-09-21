-- Enable real-time for all tables
ALTER TABLE public.threat_logs REPLICA IDENTITY FULL;
ALTER TABLE public.network_traffic REPLICA IDENTITY FULL;
ALTER TABLE public.ml_models REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_traffic;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_models;