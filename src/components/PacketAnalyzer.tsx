import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Activity,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { packetCapture } from "../services/packetCapture";

interface PacketDetection {
  type: string;
  confidence: number;
  riskLevel: string;
}

interface CapturedPacket {
  sourceIP?: string;
  destinationIP?: string;
  protocol?: string;
  destinationPort?: number | string;
  packetSize?: number | string;
  timestamp: string;
  detection: PacketDetection;
  [key: string]: unknown;
}

interface TrafficDataPoint {
  time: string;
  normal: number;
  threat: number;
  confidence: number;
}

const PacketAnalyzer = () => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPackets, setCapturedPackets] = useState<
    CapturedPacket[]
  >([]);
  const [detectionStats, setDetectionStats] = useState({
    totalPackets: 0,
    normalPackets: 0,
    threatsDetected: 0,
    blockedThreats: 0,
  });
  const [realTimeData, setRealTimeData] = useState<
    TrafficDataPoint[]
  >([]);

  useEffect(() => {
    const unsubscribe = packetCapture.subscribe((packet, detection) => {
      try {
        const safeDetection: PacketDetection = {
          type: detection?.type ?? "Normal",
          confidence:
            typeof detection?.confidence === "number"
              ? detection.confidence
              : 0,
          riskLevel: detection?.riskLevel ?? "Low",
        };

        const capturedPacket: CapturedPacket = {
          ...packet,
          detection: safeDetection,
          timestamp: new Date().toISOString(),
        };

        setCapturedPackets((prev) => [
          capturedPacket,
          ...prev.slice(0, 99),
        ]);

        setDetectionStats((prev) => ({
          totalPackets: prev.totalPackets + 1,
          normalPackets:
            safeDetection.type === "Normal"
              ? prev.normalPackets + 1
              : prev.normalPackets,
          threatsDetected:
            safeDetection.type !== "Normal"
              ? prev.threatsDetected + 1
              : prev.threatsDetected,
          blockedThreats:
            safeDetection.type !== "Normal" &&
            safeDetection.riskLevel === "Critical"
              ? prev.blockedThreats + 1
              : prev.blockedThreats,
        }));

        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        setRealTimeData((prev) => [
          ...prev.slice(-19),
          {
            time: timeLabel,
            normal: safeDetection.type === "Normal" ? 1 : 0,
            threat: safeDetection.type !== "Normal" ? 1 : 0,
            confidence: safeDetection.confidence,
          },
        ]);
      } catch (error: unknown) {
        console.error("Error updating packet UI state:", error, {
          packet,
          detection,
        });

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        toast({
          title: "Packet UI error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  const handleStartCapture = async () => {
    if (!isCapturing) {
      try {
        console.log(
          "PacketAnalyzer: Starting capture process..."
        );

        setCapturedPackets([]);
        setRealTimeData([]);
        setDetectionStats({
          totalPackets: 0,
          normalPackets: 0,
          threatsDetected: 0,
          blockedThreats: 0,
        });

        await packetCapture.startCapture("eth0");

        setIsCapturing(true);

        console.log(
          "PacketAnalyzer: Capture started successfully"
        );

        toast({
          title: "Packet Capture Started",
          description:
            "Now monitoring network traffic in real-time",
        });
      } catch (error: unknown) {
        console.error(
          "PacketAnalyzer: Start capture failed:",
          error
        );

        setIsCapturing(false);
        setCapturedPackets([]);
        setRealTimeData([]);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        const description = errorMessage.includes("ML model")
          ? errorMessage
          : `Failed to start packet capture: ${errorMessage}`;

        toast({
          title: "Cannot Start Capture",
          description,
          variant: "destructive",
          duration: 6000,
        });
      }
    } else {
      try {
        console.log("PacketAnalyzer: Stopping capture...");

        packetCapture.stopCapture();
        setIsCapturing(false);

        toast({
          title: "Packet Capture Stopped",
          description: "Network monitoring paused",
        });
      } catch (error: unknown) {
        console.error("Error stopping capture:", error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        toast({
          title: "Error stopping capture",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Critical":
        return "bg-red-500";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getThreatTypeIcon = (type: string) => {
    switch (type) {
      case "DoS":
        return <Zap className="h-4 w-4" />;
      case "Probe":
        return <Activity className="h-4 w-4" />;
      case "R2L":
        return <Shield className="h-4 w-4" />;
      case "U2R":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Real-Time Packet Analyzer
        </h2>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleStartCapture}
            className={`${
              isCapturing
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {isCapturing ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}

            {isCapturing ? "Stop Capture" : "Start Capture"}
          </Button>

          <Badge
            variant={isCapturing ? "default" : "secondary"}
            className="animate-pulse"
          >
            {isCapturing ? "CAPTURING" : "STOPPED"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />

              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Packets
                </p>

                <p className="text-2xl font-bold">
                  {detectionStats.totalPackets.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />

              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Normal Traffic
                </p>

                <p className="text-2xl font-bold">
                  {detectionStats.normalPackets.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />

              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Threats Detected
                </p>

                <p className="text-2xl font-bold text-orange-600">
                  {detectionStats.threatsDetected.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />

              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Blocked Threats
                </p>

                <p className="text-2xl font-bold text-red-600">
                  {detectionStats.blockedThreats.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime">
            Real-Time Feed
          </TabsTrigger>
          <TabsTrigger value="analysis">
            Packet Analysis
          </TabsTrigger>
          <TabsTrigger value="statistics">
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="realtime"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Traffic Monitor</CardTitle>
                <CardDescription>
                  Real-time packet classification
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ChartContainer config={{}} className="h-64">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={realTimeData.filter(
                        (data) =>
                          typeof data.normal === "number" &&
                          typeof data.threat === "number"
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />

                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />

                      <Area
                        type="monotone"
                        dataKey="normal"
                        stackId="1"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.6}
                        name="Normal Traffic"
                      />

                      <Area
                        type="monotone"
                        dataKey="threat"
                        stackId="1"
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

            <Card>
              <CardHeader>
                <CardTitle>Recent Packets</CardTitle>

                <CardDescription>
                  Last {capturedPackets.length} captured packets
                </CardDescription>
              </CardHeader>

              <CardContent className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {capturedPackets
                    .slice(0, 10)
                    .map((packet, index) => (
                      <div
                        key={`${packet.timestamp}-${index}`}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-2">
                          {getThreatTypeIcon(
                            packet.detection.type
                          )}

                          <div>
                            <p className="text-sm font-medium">
                              {packet.sourceIP ?? "Unknown"} →{" "}
                              {packet.destinationIP ?? "Unknown"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {packet.protocol ?? "Unknown"} | Port{" "}
                              {packet.destinationPort ?? "Unknown"} |{" "}
                              {packet.packetSize ?? 0}B
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            className={`${getRiskLevelColor(
                              packet.detection.riskLevel
                            )} text-white`}
                          >
                            {packet.detection.type}
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            {(
                              packet.detection.confidence * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="analysis"
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                Packet Analysis Dashboard
              </CardTitle>

              <CardDescription>
                Detailed analysis of captured network traffic
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Protocol Distribution
                  </h3>

                  <div className="space-y-2">
                    {[
                      "TCP",
                      "UDP",
                      "HTTP",
                      "HTTPS",
                      "SSH",
                    ].map((protocol) => {
                      const count = capturedPackets.filter(
                        (packet) => packet.protocol === protocol
                      ).length;

                      const percentage =
                        capturedPackets.length > 0
                          ? (count / capturedPackets.length) * 100
                          : 0;

                      return (
                        <div
                          key={protocol}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">
                            {protocol}
                          </span>

                          <div className="flex items-center space-x-2">
                            <Progress
                              value={percentage}
                              className="w-24 h-2"
                            />

                            <span className="text-xs text-muted-foreground w-12">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Threat Types
                  </h3>

                  <div className="space-y-2">
                    {["DoS", "Probe", "R2L", "U2R"].map(
                      (threatType) => {
                        const count = capturedPackets.filter(
                          (packet) =>
                            packet.detection.type === threatType
                        ).length;

                        const percentage =
                          detectionStats.threatsDetected > 0
                            ? (count /
                                detectionStats.threatsDetected) *
                              100
                            : 0;

                        return (
                          <div
                            key={threatType}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">
                              {threatType}
                            </span>

                            <div className="flex items-center space-x-2">
                              <Progress
                                value={percentage}
                                className="w-24 h-2"
                              />

                              <span className="text-xs text-muted-foreground w-12">
                                {count}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="statistics"
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Detection Statistics</CardTitle>

              <CardDescription>
                Performance metrics and analysis results
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {detectionStats.totalPackets > 0
                      ? (
                          (detectionStats.normalPackets /
                            detectionStats.totalPackets) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Normal Traffic
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {detectionStats.totalPackets > 0
                      ? (
                          (detectionStats.threatsDetected /
                            detectionStats.totalPackets) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Threat Detection Rate
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {detectionStats.threatsDetected > 0
                      ? (
                          (detectionStats.blockedThreats /
                            detectionStats.threatsDetected) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Critical Threats Blocked
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PacketAnalyzer;