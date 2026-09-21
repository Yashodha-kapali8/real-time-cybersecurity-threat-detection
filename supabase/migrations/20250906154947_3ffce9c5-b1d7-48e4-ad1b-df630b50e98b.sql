-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'user');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  department TEXT DEFAULT 'Security',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create threat logs table
CREATE TABLE public.threat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_ip TEXT NOT NULL,
  destination_ip TEXT,
  protocol TEXT,
  port INTEGER,
  threat_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'blocked', 'quarantined', 'monitoring', 'resolved')),
  confidence_score DECIMAL(5,4),
  packet_size INTEGER,
  description TEXT,
  response_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create network traffic table
CREATE TABLE public.network_traffic (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_ip TEXT NOT NULL,
  destination_ip TEXT NOT NULL,
  protocol TEXT NOT NULL,
  source_port INTEGER,
  destination_port INTEGER,
  packet_size INTEGER NOT NULL,
  flags TEXT,
  classification TEXT NOT NULL DEFAULT 'normal' CHECK (classification IN ('normal', 'suspicious', 'attack')),
  ml_confidence DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ml_models table
CREATE TABLE public.ml_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  training_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  model_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_config table
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode BOOLEAN DEFAULT false,
  auto_refresh BOOLEAN DEFAULT true,
  refresh_interval INTEGER DEFAULT 30,
  show_advanced_features BOOLEAN DEFAULT false,
  email_alerts BOOLEAN DEFAULT true,
  backup_schedule TEXT DEFAULT 'weekly' CHECK (backup_schedule IN ('daily', 'weekly', 'monthly')),
  data_retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for threat_logs
CREATE POLICY "Authenticated users can view threat logs" 
ON public.threat_logs 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Analysts and admins can insert threat logs" 
ON public.threat_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Analysts and admins can update threat logs" 
ON public.threat_logs 
FOR UPDATE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'analyst')
);

-- Create RLS policies for network_traffic
CREATE POLICY "Authenticated users can view network traffic" 
ON public.network_traffic 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Analysts and admins can insert network traffic" 
ON public.network_traffic 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'analyst')
);

-- Create RLS policies for ml_models
CREATE POLICY "Authenticated users can view ML models" 
ON public.ml_models 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage ML models" 
ON public.ml_models 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for system_config
CREATE POLICY "Users can view their own config" 
ON public.system_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own config" 
ON public.system_config 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config" 
ON public.system_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default system config
  INSERT INTO public.system_config (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();