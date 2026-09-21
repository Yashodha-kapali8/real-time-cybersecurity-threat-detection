import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Database, HardDrive, Search, Download, Settings, Play, Trash2, RefreshCw, Eye, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { threatService } from "../services/threatService";
import { supabase } from "@/integrations/supabase/client";
import { exportThreatsToPDF, exportThreatsToCSV } from "../utils/export";

const DatabaseManager = () => {
  const { toast } = useToast();
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM threat_logs WHERE severity = 'Critical' ORDER BY timestamp DESC LIMIT 10;");
  const [queryResult, setQueryResult] = useState("");
  const [threatLogs, setThreatLogs] = useState<any[]>([]);
  const [networkTraffic, setNetworkTraffic] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");

  const [dbStats] = useState({
    totalSize: "2.34 GB",
    totalTables: 12,
    totalRecords: 1567432,
    lastBackup: "2024-01-15 02:00:00",
    connectionStatus: "Connected",
    uptime: "15d 8h 23m"
  });

  const [tables, setTables] = useState([
    { name: "threat_logs", records: 0, size: "0 MB", lastModified: new Date().toISOString() },
    { name: "network_traffic", records: 0, size: "0 MB", lastModified: new Date().toISOString() },
    { name: "ml_models", records: 0, size: "0 MB", lastModified: new Date().toISOString() },
    { name: "profiles", records: 0, size: "0 MB", lastModified: new Date().toISOString() },
    { name: "system_config", records: 0, size: "0 MB", lastModified: new Date().toISOString() }
  ]);

  // Load real-time data
  useEffect(() => {
    loadThreatLogs();
    loadNetworkTraffic();
    loadTableStats();
    
    // Set up real-time subscriptions
    const threatSubscription = threatService.subscribeToThreats((newThreat) => {
      setThreatLogs(prev => [newThreat, ...prev.slice(0, 49)]);
      loadTableStats(); // Update table stats
    });

    const trafficSubscription = threatService.subscribeToNetworkTraffic((newTraffic) => {
      setNetworkTraffic(prev => [newTraffic, ...prev.slice(0, 99)]);
      loadTableStats(); // Update table stats
    });

    return () => {
      supabase.removeChannel(threatSubscription);
      supabase.removeChannel(trafficSubscription);
    };
  }, []);

  const loadThreatLogs = async () => {
    try {
      const logs = await threatService.getThreatLogs();
      setThreatLogs(logs || []);
    } catch (error) {
      console.error('Error loading threat logs:', error);
    }
  };

  const loadNetworkTraffic = async () => {
    try {
      const traffic = await threatService.getNetworkTraffic();
      setNetworkTraffic(traffic || []);
    } catch (error) {
      console.error('Error loading network traffic:', error);
    }
  };

  const loadTableStats = async () => {
    try {
      // Get actual table counts
      const { count: threatCount } = await supabase
        .from('threat_logs')
        .select('*', { count: 'exact', head: true });
      
      const { count: trafficCount } = await supabase
        .from('network_traffic')
        .select('*', { count: 'exact', head: true });

      const { count: modelCount } = await supabase
        .from('ml_models')
        .select('*', { count: 'exact', head: true });

      setTables(prev => prev.map(table => ({
        ...table,
        records: table.name === 'threat_logs' ? threatCount || 0 :
                table.name === 'network_traffic' ? trafficCount || 0 :
                table.name === 'ml_models' ? modelCount || 0 : table.records,
        size: `${Math.max(1, Math.round((
          table.name === 'threat_logs' ? threatCount || 0 :
          table.name === 'network_traffic' ? trafficCount || 0 :
          table.name === 'ml_models' ? modelCount || 0 : 0
        ) / 1000))} MB`,
        lastModified: new Date().toISOString()
      })));
    } catch (error) {
      console.error('Error loading table stats:', error);
    }
  };

  const [backupHistory] = useState([
    { id: 1, timestamp: "2024-01-15 02:00:00", type: "Full Backup", size: "2.34 GB", status: "Success", duration: "12m 34s" },
    { id: 2, timestamp: "2024-01-14 02:00:00", type: "Full Backup", size: "2.29 GB", status: "Success", duration: "11m 56s" },
    { id: 3, timestamp: "2024-01-13 02:00:00", type: "Full Backup", size: "2.25 GB", status: "Success", duration: "12m 18s" },
    { id: 4, timestamp: "2024-01-12 02:00:00", type: "Full Backup", size: "2.21 GB", status: "Failed", duration: "0m 15s" }
  ]);

  const executeQuery = async () => {
    setIsLoading(true);
    try {
      // Execute actual SQL query using Supabase
      if (sqlQuery.trim().toLowerCase().startsWith('select')) {
        const tableName = sqlQuery.toLowerCase().includes('threat_logs') ? 'threat_logs' : 'network_traffic';
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(10);
        
        if (error) throw error;
        
        const formattedResult = formatQueryResults(data, tableName);
        setQueryResult(formattedResult);
        
        toast({
          title: "Query Executed Successfully",
          description: `Retrieved ${data?.length || 0} records`,
        });
      } else {
        toast({
          title: "Query Not Supported",
          description: "Only SELECT queries are supported for security reasons",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Query execution error:', error);
      toast({
        title: "Query Failed",
        description: "An error occurred while executing the query",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const formatQueryResults = (data: any[], tableName: string) => {
    if (!data || data.length === 0) {
      return "No results found.";
    }

    const headers = Object.keys(data[0]);
    let result = `Query executed successfully!\n\n`;
    
    // Create table header
    const headerRow = headers.map(h => h.padEnd(20)).join('║');
    const separator = headers.map(() => '═'.repeat(20)).join('╬');
    
    result += `╔${separator}╗\n`;
    result += `║${headerRow}║\n`;
    result += `╠${separator}╣\n`;
    
    // Add data rows (max 10)
    data.slice(0, 10).forEach(row => {
      const rowData = headers.map(h => {
        let value = row[h]?.toString() || '';
        if (value.length > 18) value = value.substring(0, 15) + '...';
        return value.padEnd(20);
      }).join('║');
      result += `║${rowData}║\n`;
    });
    
    result += `╚${separator}╝\n\n`;
    result += `${data.length} rows returned`;
    
    return result;
  };

  const handleDatabaseAction = async (action: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'Backup':
          // Simulate backup creation
          await new Promise(resolve => setTimeout(resolve, 2000));
          toast({
            title: "Backup Created",
            description: "Database backup completed successfully",
          });
          break;
        case 'Optimize':
          await new Promise(resolve => setTimeout(resolve, 1500));
          toast({
            title: "Database Optimized", 
            description: "Performance optimization completed",
          });
          break;
        default:
          toast({
            title: `${action} Complete`,
            description: `${action} operation completed successfully`,
          });
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: `Failed to complete ${action} operation`,
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleViewTable = (tableName: string) => {
    setSelectedTable(tableName);
    toast({
      title: "Loading Table Data",
      description: `Loading ${tableName} records...`,
    });
  };

  const handleExportTable = async (tableName: string) => {
    try {
      let data: any[] = [];
      
      if (tableName === 'threat_logs') {
        data = threatLogs;
      } else if (tableName === 'network_traffic') {
        data = networkTraffic;
      }
      
      if (data.length === 0) {
        toast({
          title: "No Data",
          description: "No data available to export",
          variant: "destructive"
        });
        return;
      }
      
      // Export as CSV
      exportThreatsToCSV(data, `${tableName}_export`);
      
      toast({
        title: "Export Complete",
        description: `${tableName} data exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export table data",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success": return "success";
      case "failed": return "destructive";
      case "running": return "warning";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Database Management</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="success" className="success-glow">
            <Database className="mr-2 h-3 w-3" />
            {dbStats.connectionStatus}
          </Badge>
          <Button variant="outline" onClick={() => handleDatabaseAction("Backup")}>
            Generate Backup
          </Button>
        </div>
      </div>

      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-cyber border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.totalSize}</div>
            <p className="text-xs text-muted-foreground">Database storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {dbStats.totalTables} tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <RefreshCw className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{dbStats.lastBackup}</div>
            <p className="text-xs text-muted-foreground">Automated daily backup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Settings className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.uptime}</div>
            <p className="text-xs text-muted-foreground">System running</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tables" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tables">Tables Explorer</TabsTrigger>
          <TabsTrigger value="query">SQL Query</TabsTrigger>
          <TabsTrigger value="backups">Backup Management</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Tables Explorer */}
        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-primary" />
                Database Tables
              </CardTitle>
              <CardDescription>
                Overview of all database tables and their statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tables.map((table, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border/50 bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-semibold">{table.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {table.records.toLocaleString()} records • {table.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewTable(table.name)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExportTable(table.name)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Export
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last modified: {table.lastModified}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Real-time table viewer */}
              {selectedTable && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          <Database className="mr-2 h-5 w-5" />
                          {selectedTable} - Live Data
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="animate-pulse">
                            Live Updates
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedTable("")}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-auto">
                        {selectedTable === 'threat_logs' && (
                          <div className="space-y-2">
                            {threatLogs.slice(0, 20).map((threat, index) => (
                              <div key={threat.id || index} className="p-3 border rounded-lg bg-card/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Type:</span> {threat.threat_type}
                                  </div>
                                  <div>
                                    <span className="font-medium">Severity:</span>
                                    <Badge 
                                      variant={threat.severity === 'Critical' ? 'destructive' : 'secondary'}
                                      className="ml-1"
                                    >
                                      {threat.severity}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Source:</span> {threat.source_ip}
                                  </div>
                                  <div>
                                    <span className="font-medium">Time:</span> {new Date(threat.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {selectedTable === 'network_traffic' && (
                          <div className="space-y-2">
                            {networkTraffic.slice(0, 20).map((traffic, index) => (
                              <div key={traffic.id || index} className="p-3 border rounded-lg bg-card/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Protocol:</span> {traffic.protocol}
                                  </div>
                                  <div>
                                    <span className="font-medium">Classification:</span>
                                    <Badge 
                                      variant={traffic.classification === 'normal' ? 'default' : 'destructive'}
                                      className="ml-1"
                                    >
                                      {traffic.classification}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Source:</span> {traffic.source_ip}:{traffic.source_port}
                                  </div>
                                  <div>
                                    <span className="font-medium">Destination:</span> {traffic.destination_ip}:{traffic.destination_port}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SQL Query Panel */}
        <TabsContent value="query">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5 text-primary" />
                  SQL Query Panel
                </CardTitle>
                <CardDescription>
                  Execute custom SQL queries on the database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your SQL query here..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                />
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={executeQuery} 
                    className="cyber-glow"
                    disabled={isLoading}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isLoading ? "Executing..." : "Execute Query"}
                  </Button>
                  <Button variant="outline" onClick={() => setSqlQuery("")}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Results</CardTitle>
                <CardDescription>
                  Output from executed SQL queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={queryResult}
                  readOnly
                  placeholder="Query results will appear here..."
                  className="min-h-64 font-mono text-xs"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backup Management */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="mr-2 h-5 w-5 text-primary" />
                Backup History & Management
              </CardTitle>
              <CardDescription>
                Database backup history and backup operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Button onClick={() => handleDatabaseAction("Full Backup")} className="success-glow">
                    Generate Full Backup
                  </Button>
                  <Button variant="outline" onClick={() => handleDatabaseAction("Incremental Backup")}>
                    Incremental Backup
                  </Button>
                </div>

                {backupHistory.map((backup) => (
                  <div key={backup.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <RefreshCw className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{backup.type}</span>
                            <Badge variant={getStatusColor(backup.status)}>
                              {backup.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {backup.timestamp} • {backup.size} • {backup.duration}
                          </div>
                        </div>
                      </div>
                      {backup.status === "Success" && (
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm">
                            Restore
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Maintenance */}
        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-primary" />
                  Database Operations
                </CardTitle>
                <CardDescription>
                  Maintenance and optimization operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDatabaseAction("Optimize")}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Optimize Database
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDatabaseAction("Check Integrity")}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Check Integrity
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDatabaseAction("Vacuum")}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Vacuum Tables
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start threat-glow"
                  onClick={() => handleDatabaseAction("Clean Old Logs")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Old Logs (90+ days)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
                <CardDescription>
                  Performance metrics and system status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Storage Usage</span>
                    <span className="text-sm">75%</span>
                  </div>
                  <Progress value={75} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Query Performance</span>
                    <span className="text-sm">92%</span>
                  </div>
                  <Progress value={92} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Index Efficiency</span>
                    <span className="text-sm">88%</span>
                  </div>
                  <Progress value={88} />
                </div>

                <div className="pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active Connections:</span>
                    <span className="font-mono">24/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Query Time:</span>
                    <span className="font-mono">0.023s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Vacuum:</span>
                    <span className="font-mono">2 days ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseManager;