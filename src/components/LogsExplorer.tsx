import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  FileText,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "../hooks/use-toast";
import { threatService } from "@/services/threatService";

type LogDetails = {
  sourceIP?: unknown;
  destinationIP?: unknown;
  protocol?: unknown;
  port?: unknown;
  confidence?: unknown;
};

type LogEntry = {
  id: string | number;
  timestamp: string;
  level: string;
  type: string;
  source: string;
  message: string;
  details: LogDetails;
  actionTaken: string;
};

type ThreatRow = {
  id?: string | number;
  timestamp?: string;
  severity?: string;
  threat_type?: string;
  type?: string;
  source_ip?: string;
  source?: string;
  description?: string;
  message?: string;
  destination_ip?: string;
  protocol?: string;
  port?: number | string;
  confidence_score?: number;
  response_action?: string;
};

type ThreatSubscription = {
  unsubscribe?: () => void;
};

const normalizeThreatRow = (row: ThreatRow): LogEntry => {
  return {
    id: row.id ?? `${Date.now()}`,
    timestamp: row.timestamp ?? new Date().toISOString(),
    level: (row.severity || "info").toString().toUpperCase(),
    type: row.threat_type || row.type || "Threat",
    source: row.source_ip || row.source || "Threat Detection",
    message: row.description || row.message || row.threat_type || "",
    details: {
      sourceIP: row.source_ip,
      destinationIP: row.destination_ip,
      protocol: row.protocol,
      port: row.port,
      confidence: row.confidence_score,
    },
    actionTaken: row.response_action || "",
  };
};

const LogsExplorer = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const subscriptionRef = useRef<ThreatSubscription | null>(null);

  const logStats = useMemo(() => {
    const totalLogs = logs.length;
    let criticalAlerts = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let infoLogs = 0;

    logs.forEach((log) => {
      const lvl = log.level.toLowerCase();

      if (lvl === "critical") {
        criticalAlerts++;
      } else if (lvl === "high") {
        highSeverity++;
      } else if (lvl === "medium") {
        mediumSeverity++;
      } else if (lvl === "info") {
        infoLogs++;
      }
    });

    return {
      totalLogs,
      criticalAlerts,
      highSeverity,
      mediumSeverity,
      infoLogs,
    };
  }, [logs]);

  const getSeverityColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "secondary";
      case "info":
        return "muted";
      default:
        return "muted";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "security alert":
      case "malware detection":
      case "ddos attack":
        return AlertTriangle;
      case "authentication":
      case "policy violation":
        return Shield;
      default:
        return Info;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      log.message.toLowerCase().includes(search) ||
      log.source.toLowerCase().includes(search) ||
      log.type.toLowerCase().includes(search);

    const matchesSeverity =
      severityFilter === "all" ||
      log.level.toLowerCase() === severityFilter;

    const matchesType =
      typeFilter === "all" ||
      log.type.toLowerCase().includes(typeFilter);

    return matchesSearch && matchesSeverity && matchesType;
  });

  useEffect(() => {
    let mounted = true;

    threatService
      .getThreatLogs(100)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const normalized = (data || []).map((row) =>
          normalizeThreatRow(row as ThreatRow)
        );

        setLogs(normalized);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : String(err);

        if (mounted) {
          toast({
            title: "Could not load logs",
            description: message,
          });
        }
      });

    try {
      const chan = threatService.subscribeToThreats(
        (newRow: ThreatRow) => {
          const normalized = normalizeThreatRow(newRow);

          setLogs((prev) => [normalized, ...prev].slice(0, 500));
        }
      );

      subscriptionRef.current = chan as ThreatSubscription;
    } catch (error: unknown) {
      console.warn("Realtime subscription failed", error);
    }

    return () => {
      mounted = false;

      const sub = subscriptionRef.current;

      if (sub?.unsubscribe) {
        try {
          sub.unsubscribe();
        } catch (error: unknown) {
          console.warn(
            "Failed to unsubscribe from threat logs",
            error
          );
        }
      }

      subscriptionRef.current = null;
    };
  }, [toast]);

  const handleExport = (format: string) => {
    toast({
      title: "Export Started",
      description: `Exporting logs in ${format.toUpperCase()} format...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Logs Explorer
        </h2>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport("json")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Logs
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {logStats.totalLogs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-threat border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {logStats.criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Severity
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {logStats.highSeverity}
            </div>
            <p className="text-xs text-muted-foreground">
              Monitor closely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Medium
            </CardTitle>
            <Info className="h-4 w-4 text-secondary" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {logStats.mediumSeverity}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Info
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {logStats.infoLogs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Informational
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Search logs by message, source, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={severityFilter}
              onValueChange={setSeverityFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Severities
                </SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="authentication">
                  Authentication
                </SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="network">Network</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Security Logs ({filteredLogs.length} entries)
          </CardTitle>

          <CardDescription>
            System security events and alerts with detailed
            information
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const TypeIcon = getTypeIcon(log.type);

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <TypeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge
                            variant={getSeverityColor(log.level)}
                          >
                            {log.level}
                          </Badge>

                          <span className="font-medium">
                            {log.type}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {log.source}
                        </p>

                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {log.timestamp}
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded bg-secondary/30 border border-border/30">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Details:
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(log.details).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between"
                          >
                            <span className="text-muted-foreground capitalize">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                              :
                            </span>

                            <span className="font-mono">
                              {JSON.stringify(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/50">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Action Taken:
                      </div>

                      <div className="text-xs">
                        {log.actionTaken}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsExplorer;