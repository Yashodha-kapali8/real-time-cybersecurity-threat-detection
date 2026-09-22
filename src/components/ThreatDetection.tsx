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
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Shield,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Download,
  Eye,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { useSound } from "../hooks/useSound";
import { threatService } from "../services/threatService";
import {
  exportThreatsToPDF,
  exportThreatsToCSV,
  ThreatData,
} from "../utils/export";

// NSL-KDD Attack Categories mapping
const attackCategories: Record<string, string> = {
  "Port Scan Attack": "Probe",
  "DDoS Attempt": "DoS",
  "Malware Communication": "R2L",
  "Brute Force Login": "U2R",
  "Data Exfiltration": "R2L",
  "SQL Injection": "U2R",
  "XSS Attack": "U2R",
  "Phishing Attempt": "R2L",
};

const getRiskLevel = (severity: string, confidence: number) => {
  if (severity === "Critical" && confidence > 90) return "Extreme";
  if (
    severity === "Critical" ||
    (severity === "High" && confidence > 85)
  ) {
    return "High";
  }
  if (
    severity === "High" ||
    (severity === "Medium" && confidence > 80)
  ) {
    return "Medium";
  }
  return "Low";
};

const getPortApplication = (port: string) => {
  const portNum = parseInt(port, 10);

  const commonPorts: Record<number, string> = {
    80: "HTTP → Chrome/Firefox",
    443: "HTTPS → Chrome/Firefox",
    22: "SSH → Terminal",
    21: "FTP → FileZilla",
    25: "SMTP → Email Client",
    53: "DNS → System",
    3389: "RDP → Remote Desktop",
    8080: "HTTP Alt → Web Server",
    3306: "MySQL → Database",
    5432: "PostgreSQL → Database",
  };

  return commonPorts[portNum] || `${port} → Unknown App`;
};

const ThreatDetection = () => {
  const { toast } = useToast();
  const { playThreatAlert, playNotification, playSuccess } = useSound();

  const [searchTerm, setSearchTerm] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [realTimeThreats, setRealTimeThreats] = useState<ThreatData[]>([]);

  const [threats] = useState<ThreatData[]>(
    [
      {
        id: 1,
        type: "Port Scan Attack",
        severity: "Critical",
        source: "203.45.67.89",
        target: "192.168.1.10",
        protocol: "TCP",
        port: "443",
        timestamp: "2024-01-15 14:32:15",
        status: "Active",
        confidence: 95,
        description:
          "Automated port scanning detected from external IP",
        attackCategory: "Probe",
        riskLevel: "Extreme",
      },
      {
        id: 2,
        type: "DDoS Attempt",
        severity: "High",
        source: "Multiple IPs",
        target: "192.168.1.1",
        protocol: "UDP",
        port: "80",
        timestamp: "2024-01-15 14:28:42",
        status: "Blocked",
        confidence: 88,
        description:
          "Distributed denial of service attack detected and mitigated",
        attackCategory: "DoS",
        riskLevel: "High",
      },
      {
        id: 3,
        type: "Malware Communication",
        severity: "High",
        source: "10.0.0.25",
        target: "malicious-c2.com",
        protocol: "HTTPS",
        port: "443",
        timestamp: "2024-01-15 14:25:33",
        status: "Quarantined",
        confidence: 92,
        description:
          "Suspicious outbound communication to known C&C server",
        attackCategory: "R2L",
        riskLevel: "High",
      },
      {
        id: 4,
        type: "Brute Force Login",
        severity: "Medium",
        source: "172.16.0.12",
        target: "192.168.1.50",
        protocol: "SSH",
        port: "22",
        timestamp: "2024-01-15 14:20:15",
        status: "Monitoring",
        confidence: 76,
        description:
          "Multiple failed login attempts detected",
        attackCategory: "U2R",
        riskLevel: "Medium",
      },
      {
        id: 5,
        type: "Data Exfiltration",
        severity: "Critical",
        source: "192.168.1.45",
        target: "External FTP",
        protocol: "FTP",
        port: "21",
        timestamp: "2024-01-15 14:15:22",
        status: "Active",
        confidence: 89,
        description:
          "Large data transfer to unauthorized external server",
        attackCategory: "R2L",
        riskLevel: "Extreme",
      },
    ].map((threat) => ({
      ...threat,
      attackCategory:
        attackCategories[threat.type] || "Unknown",
      riskLevel: getRiskLevel(
        threat.severity,
        threat.confidence
      ),
      port: getPortApplication(threat.port),
    }))
  );

  // Subscribe to real-time threat detection from database
  useEffect(() => {
    if (!isMonitoring) {
      return;
    }

    const channel = threatService.subscribeToThreats(
      (threat) => {
        const confidence = threat.confidence_score || 80;

        const newThreat: ThreatData = {
          id: Date.now(),
          type: threat.threat_type,
          severity: threat.severity,
          source: threat.source_ip,
          target: threat.destination_ip || "Unknown",
          protocol: threat.protocol || "TCP",
          port: getPortApplication(
            threat.port?.toString() || "80"
          ),
          timestamp: new Date(
            threat.timestamp
          ).toLocaleString(),
          status: threat.status,
          confidence,
          description:
            threat.description || "Detected threat",
          attackCategory:
            attackCategories[threat.threat_type] ||
            "Unknown",
          riskLevel: getRiskLevel(
            threat.severity,
            confidence
          ),
        };

        setRealTimeThreats((prev) => [
          newThreat,
          ...prev.slice(0, 19),
        ]);

        if (
          soundEnabled &&
          (newThreat.severity === "Critical" ||
            newThreat.riskLevel === "Extreme")
        ) {
          playThreatAlert();
        } else if (soundEnabled) {
          playNotification();
        }

        toast({
          title: `🚨 ${newThreat.severity} Threat Detected`,
          description: `${newThreat.type} from ${newThreat.source}`,
          variant:
            newThreat.severity === "Critical"
              ? "destructive"
              : "default",
        });
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [
    isMonitoring,
    soundEnabled,
    playThreatAlert,
    playNotification,
    toast,
  ]);

  const [rules, setRules] = useState([
    {
      id: 1,
      name: "Port Scan Detection",
      active: true,
      priority: "High",
    },
    {
      id: 2,
      name: "DDoS Protection",
      active: true,
      priority: "Critical",
    },
    {
      id: 3,
      name: "Malware C&C Detection",
      active: true,
      priority: "High",
    },
    {
      id: 4,
      name: "Brute Force Prevention",
      active: false,
      priority: "Medium",
    },
    {
      id: 5,
      name: "Data Exfiltration Alert",
      active: true,
      priority: "Critical",
    },
    {
      id: 6,
      name: "Anomaly Detection",
      active: true,
      priority: "Medium",
    },
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "secondary";
      default:
        return "muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "destructive";
      case "blocked":
        return "success";
      case "quarantined":
        return "warning";
      case "monitoring":
        return "secondary";
      default:
        return "muted";
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case "extreme":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "secondary";
      case "low":
        return "muted";
      default:
        return "muted";
    }
  };

  const handleThreatResponse = (
    action: string,
    threatId: number
  ) => {
    if (soundEnabled) {
      playSuccess();
    }

    toast({
      title: "Threat Response Executed",
      description: `${action} action performed for threat #${threatId}`,
      variant: "default",
    });

    if (action === "Block IP") {
      setRealTimeThreats((prev) =>
        prev.map((threat) =>
          threat.id === threatId
            ? { ...threat, status: "Blocked" }
            : threat
        )
      );
    } else if (action === "Mark Safe") {
      setRealTimeThreats((prev) =>
        prev.filter((threat) => threat.id !== threatId)
      );
    }
  };

  const handleRuleToggle = (ruleId: number) => {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId
          ? { ...rule, active: !rule.active }
          : rule
      )
    );

    if (soundEnabled) {
      playNotification();
    }

    toast({
      title: "Rule Updated",
      description:
        "Detection rule status has been changed",
    });
  };

  const handleExportPDF = () => {
    const allThreats = [
      ...threats,
      ...realTimeThreats,
    ];

    exportThreatsToPDF(
      allThreats,
      "cybersecurity-threat-report"
    );

    if (soundEnabled) {
      playSuccess();
    }

    toast({
      title: "Export Successful",
      description: "Threat report exported to PDF",
    });
  };

  const handleExportCSV = () => {
    const allThreats = [
      ...threats,
      ...realTimeThreats,
    ];

    exportThreatsToCSV(
      allThreats,
      "threat-data-export"
    );

    if (soundEnabled) {
      playSuccess();
    }

    toast({
      title: "Export Successful",
      description: "Threat data exported to CSV",
    });
  };

  const allThreats = [...threats, ...realTimeThreats];

  const filteredThreats = allThreats.filter(
    (threat) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        threat.type.toLowerCase().includes(search) ||
        threat.source.toLowerCase().includes(search) ||
        threat.target.toLowerCase().includes(search);

      const matchesSeverity =
        filterSeverity === "all" ||
        threat.severity.toLowerCase() ===
          filterSeverity;

      const matchesStatus =
        filterStatus === "all" ||
        threat.status.toLowerCase() ===
          filterStatus;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus
      );
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Threat Detection & Response
        </h2>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSoundEnabled(!soundEnabled)
              }
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Switch
              checked={isMonitoring}
              onCheckedChange={setIsMonitoring}
              className="data-[state=checked]:bg-primary"
            />

            <span className="text-sm font-medium">
              {isMonitoring
                ? "Monitoring Active"
                : "Monitoring Paused"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              onClick={handleExportPDF}
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>

          <Button
            variant={
              isMonitoring
                ? "destructive"
                : "default"
            }
            onClick={() =>
              setIsMonitoring(!isMonitoring)
            }
            className="cyber-glow"
          >
            {isMonitoring ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause Monitoring
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Search threats by type, source, or target..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                className="pl-10"
              />
            </div>

            <Select
              value={filterSeverity}
              onValueChange={setFilterSeverity}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Severity
                </SelectItem>
                <SelectItem value="critical">
                  Critical
                </SelectItem>
                <SelectItem value="high">
                  High
                </SelectItem>
                <SelectItem value="medium">
                  Medium
                </SelectItem>
                <SelectItem value="low">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Status
                </SelectItem>
                <SelectItem value="active">
                  Active
                </SelectItem>
                <SelectItem value="blocked">
                  Blocked
                </SelectItem>
                <SelectItem value="quarantined">
                  Quarantined
                </SelectItem>
                <SelectItem value="monitoring">
                  Monitoring
                </SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                Active Threats ({filteredThreats.length})
              </CardTitle>

              <CardDescription>
                Real-time threat detection and classification results
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {filteredThreats.map((threat) => (
                  <div
                    key={threat.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      threat.riskLevel === "Extreme"
                        ? "border-destructive/50 bg-gradient-threat threat-glow"
                        : threat.severity === "Critical"
                          ? "border-destructive/30 bg-destructive/5"
                          : threat.severity === "High"
                            ? "border-warning/30 bg-warning/5"
                            : "border-border/50 bg-card/50"
                    } hover:bg-card/80`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">
                            {threat.type}
                          </h4>

                          <Badge
                            variant={getSeverityColor(
                              threat.severity
                            )}
                          >
                            {threat.severity}
                          </Badge>

                          <Badge
                            variant={getStatusColor(
                              threat.status
                            )}
                          >
                            {threat.status}
                          </Badge>

                          <Badge
                            variant={getRiskColor(
                              threat.riskLevel
                            )}
                            className="animate-pulse"
                          >
                            {threat.riskLevel} Risk
                          </Badge>

                          {threat.attackCategory && (
                            <Badge
                              variant="outline"
                              className="border-accent text-accent"
                            >
                              {threat.attackCategory}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {threat.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            Source:{" "}
                            <span className="font-mono text-primary">
                              {threat.source}
                            </span>
                          </div>

                          <div>
                            Target:{" "}
                            <span className="font-mono text-primary">
                              {threat.target}
                            </span>
                          </div>

                          <div>
                            Protocol:{" "}
                            <span className="font-mono">
                              {threat.protocol}
                            </span>
                          </div>

                          <div>
                            Port/App:{" "}
                            <span className="font-mono text-accent">
                              {threat.port}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{threat.timestamp}</span>

                          <span className="flex items-center">
                            <span className="mr-2">
                              Confidence:{" "}
                              {threat.confidence}%
                            </span>

                            <div
                              className={`h-2 w-16 rounded-full ${
                                threat.confidence > 90
                                  ? "bg-success"
                                  : threat.confidence > 75
                                    ? "bg-warning"
                                    : "bg-secondary"
                              }`}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-transparent to-white/20"
                                style={{
                                  width: `${threat.confidence}%`,
                                }}
                              />
                            </div>
                          </span>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />

                                <span>
                                  Threat Details -{" "}
                                  {threat.type}
                                </span>
                              </DialogTitle>

                              <DialogDescription>
                                Comprehensive analysis and response options
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">
                                    Attack Category (NSL-KDD)
                                  </label>

                                  <p className="text-lg font-mono text-accent">
                                    {threat.attackCategory}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">
                                    Risk Level
                                  </label>

                                  <Badge
                                    variant={getRiskColor(
                                      threat.riskLevel
                                    )}
                                    className="text-lg"
                                  >
                                    {threat.riskLevel}
                                  </Badge>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">
                                    ML Confidence
                                  </label>

                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg font-bold">
                                      {threat.confidence}%
                                    </span>

                                    <div className="flex-1 h-2 bg-secondary rounded-full">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          threat.confidence >
                                          90
                                            ? "bg-success"
                                            : threat.confidence >
                                                75
                                              ? "bg-warning"
                                              : "bg-secondary"
                                        }`}
                                        style={{
                                          width: `${threat.confidence}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">
                                    Detection Time
                                  </label>

                                  <p className="font-mono">
                                    {threat.timestamp}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Network Details
                                </label>

                                <div className="bg-secondary/20 p-3 rounded-lg font-mono text-sm">
                                  <p>
                                    Source IP:{" "}
                                    {threat.source}
                                  </p>
                                  <p>
                                    Destination:{" "}
                                    {threat.target}
                                  </p>
                                  <p>
                                    Protocol:{" "}
                                    {threat.protocol}
                                  </p>
                                  <p>
                                    Port/App:{" "}
                                    {threat.port}
                                  </p>
                                  <p>
                                    Status:{" "}
                                    {threat.status}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Threat Analysis
                                </label>

                                <p className="text-sm bg-secondary/20 p-3 rounded-lg">
                                  {threat.description}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Enhanced Threat Response Actions */}
                    <div className="flex items-center space-x-2 pt-3 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleThreatResponse(
                            "Block IP",
                            threat.id
                          )
                        }
                        className="threat-glow hover:animate-pulse"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Block IP
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleThreatResponse(
                            "Mark Safe",
                            threat.id
                          )
                        }
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Mark Safe
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleThreatResponse(
                            "Ignore",
                            threat.id
                          )
                        }
                      >
                        Ignore
                      </Button>

                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          handleThreatResponse(
                            "Learn More",
                            threat.id
                          )
                        }
                        className="cyber-glow"
                      >
                        <Zap className="mr-1 h-3 w-3" />
                        Learn More
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detection Rules */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Detection Rules
              </CardTitle>

              <CardDescription>
                Manage threat detection rules and policies
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {rule.name}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Priority: {rule.priority}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() =>
                          handleRuleToggle(rule.id)
                        }
                        className="data-[state=checked]:bg-primary"
                      />

                      <span className="text-xs">
                        {rule.active
                          ? "Active"
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Add New Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThreatDetection;