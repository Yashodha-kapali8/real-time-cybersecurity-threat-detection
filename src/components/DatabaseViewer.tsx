import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Database,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../hooks/use-toast";
import {
  threatService,
  ThreatLog,
  NetworkTraffic,
} from "../services/threatService";
import {
  exportThreatsToPDF,
  exportThreatsToCSV,
} from "../utils/export";

const DatabaseViewer = () => {
  const { toast } = useToast();

  const [threatLogs, setThreatLogs] = useState<ThreatLog[]>([]);
  const [networkTraffic, setNetworkTraffic] = useState<NetworkTraffic[]>([]);
  const [isLoadingThreats, setIsLoadingThreats] = useState(false);
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);

  const loadThreatLogs = useCallback(async () => {
    setIsLoadingThreats(true);

    try {
      const data = await threatService.getThreatLogs(100);
      setThreatLogs(data || []);

      toast({
        title: "Threat Logs Loaded",
        description: `Loaded ${data?.length || 0} threat log entries`,
      });
    } catch (error) {
      console.error("Error loading threat logs:", error);

      toast({
        title: "Error Loading Threat Logs",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingThreats(false);
    }
  }, [toast]);

  const loadNetworkTraffic = useCallback(async () => {
    setIsLoadingTraffic(true);

    try {
      const data = await threatService.getNetworkTraffic(100);
      setNetworkTraffic(data || []);

      toast({
        title: "Network Traffic Loaded",
        description: `Loaded ${data?.length || 0} traffic records`,
      });
    } catch (error) {
      console.error("Error loading network traffic:", error);

      toast({
        title: "Error Loading Network Traffic",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTraffic(false);
    }
  }, [toast]);

  const handleExportThreatsPDF = () => {
    const exportData = threatLogs.map((log) => ({
      id: parseInt(log.id || "0"),
      type: log.threat_type,
      severity: log.severity,
      source: log.source_ip,
      target: log.destination_ip || "N/A",
      protocol: log.protocol || "N/A",
      port: log.port?.toString() || "N/A",
      timestamp: log.timestamp,
      status: log.status,
      confidence: log.confidence_score || 0,
      description: log.description || "No description",
      attackCategory: log.threat_type,
      riskLevel: log.severity,
    }));

    exportThreatsToPDF(exportData);

    toast({
      title: "Export Complete",
      description: "Threat logs exported to PDF successfully",
    });
  };

  const handleExportThreatsCSV = () => {
    const exportData = threatLogs.map((log) => ({
      id: parseInt(log.id || "0"),
      type: log.threat_type,
      severity: log.severity,
      source: log.source_ip,
      target: log.destination_ip || "N/A",
      protocol: log.protocol || "N/A",
      port: log.port?.toString() || "N/A",
      timestamp: log.timestamp,
      status: log.status,
      confidence: log.confidence_score || 0,
      description: log.description || "No description",
      attackCategory: log.threat_type,
      riskLevel: log.severity,
    }));

    exportThreatsToCSV(exportData);

    toast({
      title: "Export Complete",
      description: "Threat logs exported to CSV successfully",
    });
  };

  const handleExportTrafficCSV = () => {
    const csv = [
      [
        "ID",
        "Source IP",
        "Destination IP",
        "Protocol",
        "Src Port",
        "Dst Port",
        "Packet Size",
        "Classification",
        "ML Confidence",
        "Timestamp",
        "Flags",
      ].join(","),
      ...networkTraffic.map((traffic) =>
        [
          traffic.id,
          traffic.source_ip,
          traffic.destination_ip,
          traffic.protocol,
          traffic.source_port,
          traffic.destination_port,
          traffic.packet_size,
          traffic.classification,
          traffic.ml_confidence,
          traffic.timestamp,
          traffic.flags || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `network_traffic_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();

    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Network traffic exported to CSV successfully",
    });
  };

  useEffect(() => {
    void loadThreatLogs();
    void loadNetworkTraffic();
  }, [loadThreatLogs, loadNetworkTraffic]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Database Tables
          </h2>
          <p className="text-muted-foreground">
            View and export all database records
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-primary border-primary/50"
        >
          <Database className="mr-2 h-3 w-3" />
          Real-Time Data
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Threat Logs
                </p>
                <p className="text-2xl font-bold">
                  {threatLogs.length} records
                </p>
              </div>
              <FileText className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Network Traffic
                </p>
                <p className="text-2xl font-bold">
                  {networkTraffic.length} records
                </p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="threats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="threats">Threat Logs</TabsTrigger>
          <TabsTrigger value="traffic">Network Traffic</TabsTrigger>
        </TabsList>

        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Threat Logs Table</CardTitle>
                  <CardDescription>
                    All detected threats and security incidents
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadThreatLogs}
                    disabled={isLoadingThreats}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        isLoadingThreats ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportThreatsPDF}
                    disabled={threatLogs.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportThreatsCSV}
                    disabled={threatLogs.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {threatLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No threat logs recorded yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start packet capture to detect and log threats
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Threat Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Source IP</TableHead>
                        <TableHead>Destination IP</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {threatLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>

                          <TableCell className="font-medium">
                            {log.threat_type}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={getSeverityColor(log.severity)}
                            >
                              {log.severity}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {log.source_ip}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {log.destination_ip || "-"}
                          </TableCell>

                          <TableCell>
                            {log.protocol || "-"}
                          </TableCell>

                          <TableCell>
                            {log.port || "-"}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline">
                              {log.status}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {log.confidence_score || 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Network Traffic Table</CardTitle>
                  <CardDescription>
                    All captured network packets and their classifications
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadNetworkTraffic}
                    disabled={isLoadingTraffic}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        isLoadingTraffic ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTrafficCSV}
                    disabled={networkTraffic.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {networkTraffic.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No network traffic recorded yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start packet capture to record network traffic
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Source IP</TableHead>
                        <TableHead>Destination IP</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Src Port</TableHead>
                        <TableHead>Dst Port</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>ML Confidence</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {networkTraffic.map((traffic) => (
                        <TableRow key={traffic.id}>
                          <TableCell className="text-xs">
                            {new Date(
                              traffic.timestamp
                            ).toLocaleString()}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {traffic.source_ip}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {traffic.destination_ip}
                          </TableCell>

                          <TableCell>
                            {traffic.protocol}
                          </TableCell>

                          <TableCell>
                            {traffic.source_port || "-"}
                          </TableCell>

                          <TableCell>
                            {traffic.destination_port || "-"}
                          </TableCell>

                          <TableCell>
                            {traffic.packet_size}B
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                traffic.classification === "normal"
                                  ? "outline"
                                  : "destructive"
                              }
                            >
                              {traffic.classification}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {traffic.ml_confidence
                              ? `${(
                                  traffic.ml_confidence * 100
                                ).toFixed(1)}%`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseViewer;