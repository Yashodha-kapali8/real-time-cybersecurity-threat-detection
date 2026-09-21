import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Activity, Network, Wifi, Shield, AlertTriangle, CheckCircle, Zap, Globe, Router, Server } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { useMonitoring } from "../contexts/MonitoringContext";

const NetworkMonitor = () => {
  const { toast } = useToast();
  const { 
    isNetworkMonitoring: isMonitoring, 
    startNetworkMonitoring, 
    stopNetworkMonitoring,
    networkStats 
  } = useMonitoring();
  
  const [captureInterface, setCaptureInterface] = useState("eth0");
  const [captureMode, setCaptureMode] = useState("promiscuous");
  const [packetCount, setPacketCount] = useState(0);
  const [bytesTransferred, setBytesTransferred] = useState(0);

  // Initialize packet count and bytes from localStorage if monitoring was active
  useEffect(() => {
    if (isMonitoring) {
      const savedPacketCount = localStorage.getItem('networkMonitor_packetCount');
      const savedBytesTransferred = localStorage.getItem('networkMonitor_bytesTransferred');
      if (savedPacketCount) setPacketCount(parseInt(savedPacketCount));
      if (savedBytesTransferred) setBytesTransferred(parseInt(savedBytesTransferred));
    }
  }, []);

  // Handle monitoring toggle
  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      // Save current stats before stopping
      localStorage.setItem('networkMonitor_packetCount', packetCount.toString());
      localStorage.setItem('networkMonitor_bytesTransferred', bytesTransferred.toString());
      stopNetworkMonitoring();
      toast({
        title: "Network Monitoring Stopped",
        description: "Network traffic monitoring has been stopped",
      });
    } else {
      startNetworkMonitoring();
      // Don't reset counters unless explicitly requested
      toast({
        title: "Network Monitoring Started",
        description: "Now monitoring network traffic",
      });
    }
  };

  // Reset counters
  const handleReset = () => {
    setPacketCount(0);
    setBytesTransferred(0);
    localStorage.removeItem('networkMonitor_packetCount');
    localStorage.removeItem('networkMonitor_bytesTransferred');
    toast({
      title: "Counters Reset",
      description: "Network statistics have been reset to zero",
    });
  };

  // Update and persist cumulative stats
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setPacketCount(prev => {
        const newValue = prev + networkStats.packetsPerSecond;
        localStorage.setItem('networkMonitor_packetCount', newValue.toString());
        return newValue;
      });
      setBytesTransferred(prev => {
        const newValue = prev + networkStats.bytesPerSecond * 1024 * 1024;
        localStorage.setItem('networkMonitor_bytesTransferred', newValue.toString());
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, networkStats]);

  // Real-time traffic data for charts
  const [trafficData, setTrafficData] = useState([
    { time: "00:00", incoming: 2.3, outgoing: 1.8, threats: 12 },
    { time: "00:05", incoming: 3.1, outgoing: 2.2, threats: 8 },
    { time: "00:10", incoming: 2.8, outgoing: 2.0, threats: 15 },
    { time: "00:15", incoming: 4.2, outgoing: 3.1, threats: 6 },
    { time: "00:20", incoming: 3.7, outgoing: 2.5, threats: 11 },
    { time: "00:25", incoming: 5.1, outgoing: 3.8, threats: 9 }
  ]);

  // Protocol distribution
  const protocolData = [
    { protocol: "TCP", packets: 15234, percentage: 68.2, color: "#3b82f6" },
    { protocol: "UDP", packets: 4521, percentage: 20.3, color: "#10b981" },
    { protocol: "ICMP", packets: 1892, percentage: 8.4, color: "#f59e0b" },
    { protocol: "Others", packets: 689, percentage: 3.1, color: "#ef4444" }
  ];

  // Top talkers (most active IPs)
  const topTalkers = [
    { ip: "192.168.1.105", packets: 5432, bytes: "2.3 MB", status: "trusted" },
    { ip: "10.0.0.15", packets: 3421, bytes: "1.8 MB", status: "suspicious" },
    { ip: "172.16.0.22", packets: 2156, bytes: "980 KB", status: "trusted" },
    { ip: "203.142.67.89", packets: 1934, bytes: "745 KB", status: "blocked" },
    { ip: "8.8.8.8", packets: 1567, bytes: "623 KB", status: "trusted" }
  ];

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    toast({
      title: isMonitoring ? "Monitoring Stopped" : "Monitoring Started",
      description: isMonitoring ? "Network packet capture has been paused" : "Real-time packet capture is now active",
    });
  };

  const handleInterfaceChange = (newInterface: string) => {
    setCaptureInterface(newInterface);
    toast({
      title: "Interface Changed",
      description: `Now monitoring network interface: ${newInterface}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Network Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Network Status</p>
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
                <p className={`text-xl font-bold ${networkStats.packetsPerSecond > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {networkStats.packetsPerSecond > 0 
                    ? networkStats.packetsPerSecond.toLocaleString()
                    : 'No Activity'}
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
                <p className={`text-xl font-bold ${networkStats.bytesPerSecond > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                  {networkStats.bytesPerSecond > 0 
                    ? `${networkStats.bytesPerSecond.toFixed(1)} MB/s`
                    : 'No Traffic'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className={`text-xl font-bold ${networkStats.activeConnections > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {networkStats.activeConnections > 0 
                    ? networkStats.activeConnections.toString()
                    : 'None'}
                </p>
              </div>
              <Network className="h-8 w-8 text-orange-600" />
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
                <Router className="h-5 w-5" />
                Network Packet Capture
              </CardTitle>
              <CardDescription>
                {isMonitoring && !networkStats.packetsPerSecond ? 
                  'Monitoring active - Waiting for network activity...' :
                  'Real-time network traffic monitoring and analysis'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Monitoring:</span>
                <Switch 
                  checked={isMonitoring} 
                  onCheckedChange={handleToggleMonitoring}
                />
              </div>
              <Button 
                onClick={handleToggleMonitoring} 
                variant={isMonitoring ? "destructive" : "default"}
              >
                {isMonitoring ? 'Stop Capture' : 'Start Capture'}
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Reset Stats
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Network Interface
              </label>
              <Select value={captureInterface} onValueChange={handleInterfaceChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth0">eth0 - Ethernet (Primary)</SelectItem>
                  <SelectItem value="wlan0">wlan0 - WiFi</SelectItem>
                  <SelectItem value="lo">lo - Loopback</SelectItem>
                  <SelectItem value="docker0">docker0 - Docker Bridge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Capture Mode
              </label>
              <Select value={captureMode} onValueChange={setCaptureMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promiscuous">Promiscuous Mode</SelectItem>
                  <SelectItem value="normal">Normal Mode</SelectItem>
                  <SelectItem value="monitor">Monitor Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Buffer Status
              </label>
              <div className="space-y-2">
                <Progress value={67} className="h-2" />
                <p className="text-xs text-muted-foreground">Buffer: 67% (2.1 MB / 3.1 MB)</p>
              </div>
            </div>
          </div>

          {/* Real-time statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{packetCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Packets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{(bytesTransferred / 1024 / 1024).toFixed(1)}M</p>
              <p className="text-xs text-muted-foreground">Bytes Captured</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{currentThroughput.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">MB/s Current</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{networkStats.allowedPackets.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Allowed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{networkStats.blockedPackets}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{networkStats.suspiciousConnections}</p>
              <p className="text-xs text-muted-foreground">Suspicious</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traffic Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Traffic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Traffic Flow
            </CardTitle>
            <CardDescription>Network traffic in MB/s over time</CardDescription>
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
                    dataKey="incoming" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Incoming"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="outgoing" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="Outgoing"
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
              {protocolData.map((protocol) => (
                <div key={protocol.protocol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: protocol.color }}
                    />
                    <span className="font-medium">{protocol.protocol}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {protocol.packets.toLocaleString()} packets
                    </span>
                    <Badge variant="secondary">
                      {protocol.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Talkers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Top Network Talkers
          </CardTitle>
          <CardDescription>Most active IP addresses by packet count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTalkers.map((talker, index) => (
              <div key={talker.ip} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 text-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-mono font-medium">{talker.ip}</p>
                    <p className="text-sm text-muted-foreground">
                      {talker.packets.toLocaleString()} packets • {talker.bytes}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={
                    talker.status === 'trusted' ? 'default' : 
                    talker.status === 'suspicious' ? 'destructive' : 'secondary'
                  }
                  className="flex items-center gap-1"
                >
                  {talker.status === 'trusted' && <CheckCircle className="h-3 w-3" />}
                  {talker.status === 'suspicious' && <AlertTriangle className="h-3 w-3" />}
                  {talker.status === 'blocked' && <Shield className="h-3 w-3" />}
                  {talker.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkMonitor;