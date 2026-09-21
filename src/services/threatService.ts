import { supabase } from '@/integrations/supabase/client';

export interface ThreatLog {
  id?: string;
  threat_type: string;
  severity: string;
  source_ip: string;
  destination_ip?: string;
  protocol?: string;
  port?: number;
  timestamp?: string;
  status: string;
  confidence_score?: number;
  description?: string;
  response_action?: string;
  packet_size?: number;
}

export interface NetworkTraffic {
  id?: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  source_port?: number;
  destination_port?: number;
  packet_size: number;
  classification: string;
  ml_confidence?: number;
  timestamp?: string;
  flags?: string;
}

export const threatService = {
  // Threat logs operations
  async createThreatLog(threatLog: Omit<ThreatLog, 'id'>) {
    const { data, error } = await supabase
      .from('threat_logs')
      .insert([threatLog])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getThreatLogs(limit = 50) {
    const { data, error } = await supabase
      .from('threat_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async updateThreatLog(id: string, updates: Partial<ThreatLog>) {
    const { data, error } = await supabase
      .from('threat_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Network traffic operations
  async createNetworkTraffic(traffic: Omit<NetworkTraffic, 'id'>) {
    const { data, error } = await supabase
      .from('network_traffic')
      .insert([traffic])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getNetworkTraffic(limit = 100) {
    const { data, error } = await supabase
      .from('network_traffic')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Real-time subscriptions
  subscribeToThreats(callback: (threat: ThreatLog) => void) {
    return supabase
      .channel('threat_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'threat_logs'
      }, (payload) => {
        callback(payload.new as ThreatLog);
      })
      .subscribe();
  },

  subscribeToNetworkTraffic(callback: (traffic: NetworkTraffic) => void) {
    return supabase
      .channel('network_traffic')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'network_traffic'
      }, (payload) => {
        callback(payload.new as NetworkTraffic);
      })
      .subscribe();
  }
};

// Note: Mock data generators removed. All data now comes from real ML model predictions.
// Train your model using training.py with NSL-KDD dataset to start detecting real threats.