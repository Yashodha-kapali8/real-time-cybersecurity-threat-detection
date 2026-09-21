import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Activity, Shield, AlertTriangle, TrendingUp, Users, Globe, Database } from "lucide-react";
import { useState, useEffect } from "react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPackets: 156432,
    threatsDetected: 23,
    threatsBlocked: 19,
    systemLoad: 67,
    activeConnections: 1247,
    lastScan: "2 minutes ago"
  });

  const [recentThreats] = useState([
    { 
      id: 1, 
      type: "Port Scan", 
      severity: "high", 
      source: "192.168.1.105", 
      time: "2 min ago",
      status: "blocked"
    },
    { 
      id: 2, 
      type: "DDoS Attempt", 
      severity: "critical", 
      source: "203.45.67.89", 
      time: "5 min ago",
      status: "blocked"
    },
    { 
      id: 3, 
      type: "Malware Download", 
      severity: "high", 
      source: "10.0.0.25", 
      time: "8 min ago",
      status: "quarantined"
    },
    { 
      id: 4, 
      type: "Brute Force", 
      severity: "medium", 
      source: "172.16.0.12", 
      time: "12 min ago",
      status: "monitoring"
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalPackets: prev.totalPackets + Math.floor(Math.random() * 50),
        threatsDetected: prev.threatsDetected + (Math.random() > 0.9 ? 1 : 0),
        systemLoad: Math.max(40, Math.min(90, prev.systemLoad + (Math.random() - 0.5) * 10)),
        activeConnections: prev.activeConnections + Math.floor((Math.random() - 0.5) * 20)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
        <Badge variant="outline" className="text-success border-success/50">
          <Activity className="mr-2 h-3 w-3" />
          Real-time Monitoring
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-cyber border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packets</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPackets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-threat border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.threatsDetected}</div>
            <p className="text-xs text-muted-foreground">{stats.threatsBlocked} blocked automatically</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-safe border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.systemLoad}%</div>
            <Progress value={stats.systemLoad} className="mt-2" />
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
            Latest security events detected by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentThreats.map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium">{threat.type}</span>
                    <span className="text-sm text-muted-foreground">Source: {threat.source}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={getSeverityColor(threat.severity)}>
                    {threat.severity}
                  </Badge>
                  <Badge variant={getStatusColor(threat.status)}>
                    {threat.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{threat.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;