-- Fix RLS policies to allow system services to insert data

-- Drop existing restrictive policies for network_traffic
DROP POLICY IF EXISTS "Analysts and admins can insert network traffic" ON public.network_traffic;

-- Create new policy that allows authenticated users to insert network traffic
-- This allows the packet capture service to work properly
CREATE POLICY "Allow authenticated users to insert network traffic" 
ON public.network_traffic 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Similarly fix threat_logs policy
DROP POLICY IF EXISTS "Analysts and admins can insert threat logs" ON public.threat_logs;

-- Create new policy for threat logs
CREATE POLICY "Allow authenticated users to insert threat logs" 
ON public.threat_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for better UI updates
ALTER TABLE public.network_traffic REPLICA IDENTITY FULL;
ALTER TABLE public.threat_logs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_traffic;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_logs;