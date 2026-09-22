import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { useMonitoring } from "../contexts/MonitoringContext";
import {
  packetCapture,
  PacketData,
  ThreatDetection,
} from "../services/packetCapture";
import { useSound } from "../hooks/useSound";

const RealTimeMonitor = () => {
  const { toast } = useToast();
  const { playThreatAlert } = useSound();
  const {
    isRealTimeMonitoring: isMonitoring,
    startRealTimeMonitoring,
    stopRealTimeMonitoring,
  } = useMonitoring();

  const [soundAlerts, setSoundAlerts] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [recentPackets, setRecentPackets] = useState<
    Array<{
      packet: PacketData;
      detection: ThreatDetection;
    }>
  >([]);

  const [threatStats, setThreatStats] = useState({
    totalPackets: 0,
    threatsDetected: 0,
    normalTraffic: 0,
    criticalThreats: 0,
    highThreats: 0,
  });

  const [selectedPacket, setSelectedPacket] = useState<{
    packet: PacketData;
    detection: ThreatDetection;
  } | null>(null);

  // Cleanup monitoring when the component unmounts.
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopRealTimeMonitoring();
      }
    };
  }, [isMonitoring, stopRealTimeMonitoring]);

  // Subscribe to packet capture events while monitoring is active.
  useEffect(() => {
    if (!isMonitoring) {
      return;
    }

    const unsubscribe = packetCapture.subscribe(
      (packet, detection) => {
        const newEntry = { packet, detection };

        setRecentPackets((prev) => [
          newEntry,
          ...prev.slice(0, 49),
        ]);

        setThreatStats((prev) => ({
          ...prev,
          totalPackets: prev.totalPackets + 1,
          threatsDetected:
            detection.type !== "Normal"
              ? prev.threatsDetected + 1
              : prev.threatsDetected,
          normalTraffic:
            detection.type === "Normal"
              ? prev.normalTraffic + 1
              : prev.normalTraffic,
          criticalThreats:
            detection.riskLevel === "Critical"
              ? prev.criticalThreats + 1
              : prev.criticalThreats,
          highThreats:
            detection.riskLevel === "High"
              ? prev.highThreats + 1
              : prev.highThreats,
        }));

        if (
          soundAlerts &&
          (detection.riskLevel === "Critical" ||
            detection.riskLevel === "High")
        ) {
          playThreatAlert();
        }

        if (detection.riskLevel === "Critical") {
          toast({
            title: "🚨 Critical Threat Detected!",
            description: `${detection.type} attack from ${packet.sourceIP}`,
            variant: "destructive",
          });
        }
      }
    );

    return unsubscribe;
  }, [
    isMonitoring,
    soundAlerts,
    playThreatAlert,
    toast,
  ]);

  const handleToggleMonitoring = async () => {
    if (isStarting) {
      return;
    }

    try {
      if (isMonitoring) {
        stopRealTimeMonitoring();
        setRecentPackets([]);

        toast({
          title: "Monitoring Stopped",
          description:
            "Real-time packet monitoring has been stopped.",
        });
      } else {
        setIsStarting(true);

        await startRealTimeMonitoring();
        setRecentPackets([]);

        toast({
          title: "Monitoring Started",
          description:
            "Real-time packet monitoring with trained XGBoost model is now active.",
        });
      }
    } catch (error: unknown) {
      console.error(
        "Failed to toggle monitoring:",
        error
      );

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to toggle monitoring",
        variant: "destructive",
      });

      stopRealTimeMonitoring();
    } finally {
      setIsStarting(false);
    }
  };

  const getSeverityColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Critical":
        return "destructive";
      case "High":
        return "destructive";
      case "Medium":
        return "secondary";
      case "Low":
        return "outline";
      default:
        return "default";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Normal":
        return (
          <CheckCircle className="h-4 w-4 text-green-500" />
        );
      case "DoS":
        return (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        );
      case "Probe":
        return (
          <Eye className="h-4 w-4 text-orange-500" />
        );
      case "R2L":
        return (
          <Shield className="h-4 w-4 text-yellow-500" />
        );
      case "U2R":
        return (
          <Zap className="h-4 w-4 text-purple-500" />
        );
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Real-Time Monitoring
        </h2>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Sound Alerts:
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundAlerts(!soundAlerts)}
              className="p-2"
            >
              {soundAlerts ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Monitoring:
            </span>

            <Switch
              checked={isMonitoring}
              onCheckedChange={handleToggleMonitoring}
            />
          </div>

          <Button
            onClick={handleToggleMonitoring}
            variant={
              isMonitoring ? "destructive" : "default"
            }
            className="flex items-center space-x-2"
            disabled={isStarting}
          >
            {isMonitoring ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}

            {isStarting
              ? "Starting..."
              : isMonitoring
                ? "Stop Monitoring"
                : "Start Monitoring"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Packets
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {threatStats.totalPackets.toLocaleString()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Threats Detected
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {threatStats.threatsDetected}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Normal Traffic
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {threatStats.normalTraffic}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Critical Threats
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {threatStats.criticalThreats}
                </p>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  High Risk
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {threatStats.highThreats}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Live Packet Feed
              </CardTitle>

              <CardDescription>
                Real-time network packets with ML-based threat detection
              </CardDescription>
            </div>

            {isMonitoring && (
              <Badge
                variant="default"
                className="bg-green-500 animate-pulse"
              >
                <div className="h-2 w-2 bg-white rounded-full mr-2 animate-ping" />
                Live
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 max-h-96 overflow-auto">
            {recentPackets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isMonitoring
                  ? "Waiting for packets..."
                  : "Start monitoring to see live packet data"}
              </div>
            ) : (
              recentPackets.map((entry, index) => (
                <Dialog key={`${entry.packet.timestamp}-${index}`}>
                  <DialogTrigger asChild>
                    <div
                      className="p-3 border rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-colors"
                      onClick={() =>
                        setSelectedPacket(entry)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(
                            entry.detection.type
                          )}

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">
                                {entry.packet.sourceIP} →{" "}
                                {entry.packet.destinationIP}
                              </span>

                              <Badge variant="outline">
                                {entry.packet.protocol}
                              </Badge>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Port{" "}
                              {entry.packet.destinationPort} •{" "}
                              {entry.packet.packetSize} bytes
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={getSeverityColor(
                              entry.detection.riskLevel
                            )}
                          >
                            {entry.detection.type}
                          </Badge>

                          <Badge variant="secondary">
                            {(
                              entry.detection.confidence * 100
                            ).toFixed(1)}
                            %
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              entry.packet.timestamp
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        {getTypeIcon(
                          entry.detection.type
                        )}
                        <span className="ml-2">
                          Packet Details
                        </span>
                      </DialogTitle>

                      <DialogDescription>
                        Detailed analysis of captured network packet
                      </DialogDescription>
                    </DialogHeader>

                    {selectedPacket && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold">
                              Packet Information
                            </h4>

                            <div className="text-sm space-y-1">
                              <div>
                                <span className="font-medium">
                                  Source IP:
                                </span>{" "}
                                {selectedPacket.packet.sourceIP}
                              </div>

                              <div>
                                <span className="font-medium">
                                  Destination IP:
                                </span>{" "}
                                {
                                  selectedPacket.packet
                                    .destinationIP
                                }
                              </div>

                              <div>
                                <span className="font-medium">
                                  Protocol:
                                </span>{" "}
                                {selectedPacket.packet.protocol}
                              </div>

                              <div>
                                <span className="font-medium">
                                  Source Port:
                                </span>{" "}
                                {selectedPacket.packet.sourcePort}
                              </div>

                              <div>
                                <span className="font-medium">
                                  Destination Port:
                                </span>{" "}
                                {
                                  selectedPacket.packet
                                    .destinationPort
                                }
                              </div>

                              <div>
                                <span className="font-medium">
                                  Packet Size:
                                </span>{" "}
                                {
                                  selectedPacket.packet.packetSize
                                }{" "}
                                bytes
                              </div>

                              <div>
                                <span className="font-medium">
                                  Timestamp:
                                </span>{" "}
                                {new Date(
                                  selectedPacket.packet.timestamp
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold">
                              Threat Analysis
                            </h4>

                            <div className="text-sm space-y-1">
                              <div>
                                <span className="font-medium">
                                  Detection Type:
                                </span>{" "}
                                {
                                  selectedPacket.detection.type
                                }
                              </div>

                              <div>
                                <span className="font-medium">
                                  Risk Level:
                                </span>

                                <Badge
                                  variant={getSeverityColor(
                                    selectedPacket.detection
                                      .riskLevel
                                  )}
                                  className="ml-2"
                                >
                                  {
                                    selectedPacket.detection
                                      .riskLevel
                                  }
                                </Badge>
                              </div>

                              <div>
                                <span className="font-medium">
                                  Confidence:
                                </span>{" "}
                                {(
                                  selectedPacket.detection
                                    .confidence * 100
                                ).toFixed(1)}
                                %
                              </div>

                              {selectedPacket.detection
                                .attackCategory && (
                                <div>
                                  <span className="font-medium">
                                    Attack Category:
                                  </span>{" "}
                                  {
                                    selectedPacket.detection
                                      .attackCategory
                                  }
                                </div>
                              )}

                              <div>
                                <span className="font-medium">
                                  Description:
                                </span>{" "}
                                {
                                  selectedPacket.detection
                                    .description
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMonitor;