import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Activity, Shield, AlertTriangle, TrendingUp, Users, Globe, Database, Zap, Eye, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSound } from "../hooks/useSound";
import { useToast } from "../hooks/use-toast";
import { exportThreatsToPDF } from "../utils/export";

const EnhancedDashboard = () => {
  const { playNotification } = useSound();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalPackets: 156432,
    threatsDetected: 23,
    threatsBlocked: 19,
    systemLoad: 67,
    activeConnections: 1247,
    lastScan: "2 minutes ago",
    mlAccuracy: 94.5,
    falsePositives: 2,
    responseTime: 0.2 // seconds
  });

  const [networkStats, setNetworkStats] = useState({
    inbound: 2450,
    outbound: 1834,
    blocked: 156,
    allowed: 4128
  });

  // Real-time chart data
  const [chartData, setChartData] = useState<any[]>([]);
  const [threatTrendData, setThreatTrendData] = useState<any[]>([]);
  const [protocolData, setProtocolData] = useState([
    { name: 'TCP', value: 45, color: '#00d4ff' },
    { name: 'UDP', value: 25, color: '#ff6b6b' },
    { name: 'HTTP', value: 20, color: '#4ecdc4' },
    { name: 'HTTPS', value: 10, color: '#45b7d1' }
  ]);

  const [recentThreats] = useState([
    { 
      id: 1, 
      type: "Port Scan", 
      severity: "high", 
      source: "192.168.1.105", 
      time: "2 min ago",
      status: "blocked",
      attackCategory: "Probe",
      riskLevel: "High"
    },
    { 
      id: 2, 
      type: "DDoS Attempt", 
      severity: "critical", 
      source: "203.45.67.89", 
      time: "5 min ago",
      status: "blocked",
      attackCategory: "DoS",
      riskLevel: "Extreme"
    },
    { 
      id: 3, 
      type: "Malware Download", 
      severity: "high", 
      source: "10.0.0.25", 
      time: "8 min ago",
      status: "quarantined",
      attackCategory: "R2L",
      riskLevel: "High"
    },
    { 
      id: 4, 
      type: "Brute Force", 
      severity: "medium", 
      source: "172.16.0.12", 
      time: "12 min ago",
      status: "monitoring",
      attackCategory: "U2R",
      riskLevel: "Medium"
    }
  ]);

  // Generate real-time chart data
  useEffect(() => {
    const generateChartData = () => {
      const now = Date.now();
      const newData = [];
      const newThreatData = [];
      
      for (let i = 29; i >= 0; i--) {
        const time = new Date(now - i * 60000); // Every minute
        newData.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          packets: Math.floor(Math.random() * 1000) + 2000,
          threats: Math.floor(Math.random() * 10) + 1,
          blocked: Math.floor(Math.random() * 8) + 1,
          normal: Math.floor(Math.random() * 2000) + 1800
        });

        if (i < 7) { // Last 7 data points for threat trend
          newThreatData.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            DoS: Math.floor(Math.random() * 3) + 1,
            Probe: Math.floor(Math.random() * 4) + 2,
            R2L: Math.floor(Math.random() * 3) + 1,
            U2R: Math.floor(Math.random() * 2) + 1,
          });
        }
      }
      
      setChartData(newData);
      setThreatTrendData(newThreatData);
    };

    generateChartData();
    const interval = setInterval(generateChartData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        const newThreats = prev.threatsDetected + (Math.random() > 0.8 ? 1 : 0);
        const didDetectThreat = newThreats > prev.threatsDetected;
        
        if (didDetectThreat) {
          playNotification();
          toast({
            title: "🛡️ New Threat Detected",
            description: "Real-time analysis identified suspicious activity",
            variant: "default",
          });
        }

        return {
          ...prev,
          totalPackets: prev.totalPackets + Math.floor(Math.random() * 50) + 20,
          threatsDetected: newThreats,
          threatsBlocked: Math.min(newThreats, prev.threatsBlocked + (didDetectThreat && Math.random() > 0.3 ? 1 : 0)),
          systemLoad: Math.max(40, Math.min(90, prev.systemLoad + (Math.random() - 0.5) * 10)),
          activeConnections: Math.max(1000, prev.activeConnections + Math.floor((Math.random() - 0.5) * 40)),
          mlAccuracy: Math.max(88, Math.min(99, prev.mlAccuracy + (Math.random() - 0.5) * 2)),
          responseTime: Math.max(0.1, Math.min(1.0, prev.responseTime + (Math.random() - 0.5) * 0.1))
        };
      });

      setNetworkStats(prev => ({
        ...prev,
        inbound: prev.inbound + Math.floor((Math.random() - 0.5) * 200),
        outbound: prev.outbound + Math.floor((Math.random() - 0.5) * 150),
        blocked: prev.blocked + Math.floor(Math.random() * 10),
        allowed: prev.allowed + Math.floor(Math.random() * 100)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [playNotification, toast]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "warning";
      case "medium": return "secondary";
      default: return "muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "blocked": return "success";
      case "quarantined": return "warning";
      case "monitoring": return "secondary";
      default: return "muted";
    }
  };

  const handleExportReport = () => {
    const reportData = recentThreats.map(threat => ({
      id: threat.id,
      type: threat.type,
      severity: threat.severity,
      source: threat.source,
      target: 'Internal Network',
      protocol: 'TCP',
      port: '443 → Chrome',
      timestamp: new Date().toLocaleString(),
      status: threat.status,
      confidence: Math.floor(Math.random() * 20) + 80,
      description: `${threat.type} detected from ${threat.source}`,
      attackCategory: threat.attackCategory,
      riskLevel: threat.riskLevel
    }));

    exportThreatsToPDF(reportData, 'dashboard-threat-summary');
    toast({
      title: "Report Exported",
      description: "Dashboard summary exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">CyberDefense Pro Dashboard</h2>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-success border-success/50 animate-pulse">
            <Activity className="mr-2 h-3 w-3" />
            Real-time Monitoring
          </Badge>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-cyber border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 scan-animation opacity-20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Packets</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPackets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
            <div className="mt-2 h-1 bg-secondary rounded-full">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{width: '67%'}}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-threat border-destructive/20 relative overflow-hidden">
          <div className={`absolute inset-0 ${stats.threatsDetected > 20 ? 'threat-glow' : ''}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.threatsDetected}</div>
            <p className="text-xs text-muted-foreground">{stats.threatsBlocked} blocked automatically</p>
            <div className="mt-2 flex items-center space-x-2 text-xs">
              <span>False Positives: {stats.falsePositives}</span>
              <Badge variant="outline" className="text-xs">
                {((stats.threatsDetected - stats.falsePositives) / stats.threatsDetected * 100).toFixed(1)}% accurate
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-safe border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ML Model Performance</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.mlAccuracy}%</div>
            <Progress value={stats.mlAccuracy} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Response: {stats.responseTime.toFixed(2)}s avg
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConnections.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last scan: {stats.lastScan}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="text-success">✓ {networkStats.allowed}</div>
              <div className="text-destructive">✗ {networkStats.blocked}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Network Traffic Analysis
            </CardTitle>
            <CardDescription>Real-time packet flow and threat detection</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="normal" 
                  stackId="1"
                  stroke="hsl(var(--success))" 
                  fill="hsl(var(--success) / 0.2)" 
                  name="Normal Traffic"
                />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  stackId="1"
                  stroke="hsl(var(--destructive))" 
                  fill="hsl(var(--destructive) / 0.3)" 
                  name="Threats"
                />
                <Area 
                  type="monotone" 
                  dataKey="blocked" 
                  stackId="1"
                  stroke="hsl(var(--warning))" 
                  fill="hsl(var(--warning) / 0.2)" 
                  name="Blocked"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              Attack Categories (NSL-KDD)
            </CardTitle>
            <CardDescription>Real-time threat classification breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={threatTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="DoS" fill="hsl(var(--destructive))" name="DoS Attacks" />
                <Bar dataKey="Probe" fill="hsl(var(--warning))" name="Probe Attacks" />
                <Bar dataKey="R2L" fill="hsl(var(--accent))" name="R2L Attacks" />
                <Bar dataKey="U2R" fill="hsl(var(--primary))" name="U2R Attacks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Distribution and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5 text-primary" />
              Protocol Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={protocolData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {protocolData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>ML Model Status</span>
                <Badge variant="default" className="bg-success text-success-foreground animate-pulse">
                  <Zap className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Packet Capture</span>
                <Badge variant="default" className="bg-success text-success-foreground">Running</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Real-time Analysis</span>
                <Badge variant="default" className="bg-success text-success-foreground">Enabled</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Database Connection</span>
                <Badge variant="default" className="bg-success text-success-foreground">Connected</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>NSL-KDD Model</span>
                <Badge variant="outline" className="border-primary text-primary">
                  v2.1 Trained
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm">{stats.systemLoad}%</span>
                </div>
                <Progress value={stats.systemLoad} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm">45%</span>
                </div>
                <Progress value={45} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Network I/O</span>
                  <span className="text-sm">72%</span>
                </div>
                <Progress value={72} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">ML Processing</span>
                  <span className="text-sm text-success">{stats.mlAccuracy}%</span>
                </div>
                <Progress value={stats.mlAccuracy} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Threats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-primary" />
            Recent Threat Activity
          </CardTitle>
          <CardDescription>
            Latest security events detected by the NSL-KDD trained model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentThreats.map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/70 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium">{threat.type}</span>
                    <span className="text-sm text-muted-foreground">Source: {threat.source}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="border-accent text-accent">
                    {threat.attackCategory}
                  </Badge>
                  <Badge variant={getSeverityColor(threat.severity)}>
                    {threat.severity}
                  </Badge>
                  <Badge variant={getStatusColor(threat.status)}>
                    {threat.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{threat.time}</span>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;