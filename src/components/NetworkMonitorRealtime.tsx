import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Activity, Network, Zap, Globe, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const NetworkMonitorRealtime = () => {
  const { toast } = useToast();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [networkStats, setNetworkStats] = useState({
    packetsPerSecond: 0,
    bytesPerSecond: 0,
    activeConnections: 0,
    threatsDetected: 0,
    blockedPackets: 0,
    allowedPackets: 0
  });
  const [trafficData, setTrafficData] = useState<Array<{ time: string; packets: number; threats: number }>>([]);
  const [protocolDist, setProtocolDist] = useState<Record<string, number>>({});

  // Fetch real-time network traffic from Supabase
  useEffect(() => {
    if (!isMonitoring) return;

    const fetchNetworkStats = async () => {
      try {
        // Get network traffic from last minute
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        
        const { data: trafficData, error: trafficError } = await supabase
          .from('network_traffic')
          .select('*')
          .gte('timestamp', oneMinuteAgo)
          .order('timestamp', { ascending: false });

        if (trafficError) throw trafficError;

        // Get threat logs from last minute
        const { data: threatData, error: threatError } = await supabase
          .from('threat_logs')
          .select('*')
          .gte('timestamp', oneMinuteAgo)
          .order('timestamp', { ascending: false });

        if (threatError) throw threatError;

        // Calculate stats
        const totalPackets = trafficData?.length || 0;
        const totalThreats = threatData?.length || 0;
        const normalTraffic = trafficData?.filter(t => t.classification === 'normal').length || 0;
        
        // Calculate bytes per second
        const totalBytes = trafficData?.reduce((sum, t) => sum + (t.packet_size || 0), 0) || 0;
        const bytesPerSec = totalBytes / 60; // Average over 1 minute

        // Protocol distribution
        const protocols: Record<string, number> = {};
        trafficData?.forEach(t => {
          protocols[t.protocol] = (protocols[t.protocol] || 0) + 1;
        });

        setNetworkStats({
          packetsPerSecond: Math.round(totalPackets / 60),
          bytesPerSecond: bytesPerSec,
          activeConnections: totalPackets,
          threatsDetected: totalThreats,
          blockedPackets: totalThreats,
          allowedPackets: normalTraffic
        });

        setProtocolDist(protocols);

        // Update traffic chart data
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
          const timeSlot = new Date(Date.now() - i * 10000);
          const timeStr = timeSlot.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
          
          const slotPackets = trafficData?.filter(t => 
            new Date(t.timestamp).getTime() > timeSlot.getTime() - 10000 &&
            new Date(t.timestamp).getTime() <= timeSlot.getTime()
          ).length || 0;

          const slotThreats = threatData?.filter(t => 
            new Date(t.timestamp).getTime() > timeSlot.getTime() - 10000 &&
            new Date(t.timestamp).getTime() <= timeSlot.getTime()
          ).length || 0;

          chartData.push({ time: timeStr, packets: slotPackets, threats: slotThreats });
        }

        setTrafficData(chartData);

      } catch (error) {
        console.error('Error fetching network stats:', error);
      }
    };

    // Initial fetch
    fetchNetworkStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('network-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'network_traffic' }, fetchNetworkStats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threat_logs' }, fetchNetworkStats)
      .subscribe();

    // Refresh every 10 seconds
    const interval = setInterval(fetchNetworkStats, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isMonitoring]);

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    toast({
      title: isMonitoring ? "Monitoring Stopped" : "Monitoring Started",
      description: isMonitoring ? "Network monitoring has been paused" : "Real-time network monitoring is now active",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-xl font-bold ${isMonitoring ? 'text-green-600' : 'text-red-600'}`}>
                  {isMonitoring ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`h-3 w-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Packets/sec</p>
                <p className="text-xl font-bold text-blue-600">
                  {networkStats.packetsPerSecond}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Throughput</p>
                <p className="text-xl font-bold text-purple-600">
                  {(networkStats.bytesPerSecond / 1024).toFixed(1)} KB/s
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Threats</p>
                <p className="text-xl font-bold text-red-600">
                  {networkStats.threatsDetected}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Packet Capture
              </CardTitle>
              <CardDescription>Real-time network traffic from Supabase database</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Monitoring:</span>
                <Switch 
                  checked={isMonitoring} 
                  onCheckedChange={handleToggleMonitoring}
                />
              </div>
              <Button onClick={handleToggleMonitoring} variant={isMonitoring ? "destructive" : "default"}>
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{networkStats.activeConnections}</p>
              <p className="text-xs text-muted-foreground">Total Packets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{networkStats.allowedPackets}</p>
              <p className="text-xs text-muted-foreground">Normal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{networkStats.threatsDetected}</p>
              <p className="text-xs text-muted-foreground">Threats</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{networkStats.blockedPackets}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{networkStats.packetsPerSecond}</p>
              <p className="text-xs text-muted-foreground">Packets/sec</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">
                {(networkStats.bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s
              </p>
              <p className="text-xs text-muted-foreground">Throughput</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Traffic Flow
            </CardTitle>
            <CardDescription>Packet count over last minute</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="packets" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Packets"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="threats" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Threats"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Protocol Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Protocol Distribution
            </CardTitle>
            <CardDescription>Network traffic by protocol type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(protocolDist).map(([protocol, count]) => {
                const total = Object.values(protocolDist).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
                return (
                  <div key={protocol} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="font-medium">{protocol}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {count} packets
                      </span>
                      <Badge variant="secondary">
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {Object.keys(protocolDist).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {isMonitoring ? "Waiting for traffic data..." : "Start monitoring to see protocol distribution"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetworkMonitorRealtime;
