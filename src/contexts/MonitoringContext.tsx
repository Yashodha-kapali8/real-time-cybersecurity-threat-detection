import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { packetCapture } from "../services/packetCapture";

interface NetworkStats {
  packetsPerSecond: number;
  bytesPerSecond: number;
  activeConnections: number;
  suspiciousConnections: number;
  blockedPackets: number;
  allowedPackets: number;
}

interface MonitoringContextType {
  isNetworkMonitoring: boolean;
  isRealTimeMonitoring: boolean;
  networkStats: NetworkStats;
  startNetworkMonitoring: () => void;
  stopNetworkMonitoring: () => void;
  startRealTimeMonitoring: () => Promise<void>;
  stopRealTimeMonitoring: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(
  undefined,
);

export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNetworkMonitoring, setIsNetworkMonitoring] = useState(() => {
    const saved = localStorage.getItem("isNetworkMonitoring");
    return saved === "true";
  });

  const [isRealTimeMonitoring, setIsRealTimeMonitoring] = useState(() => {
    const saved = localStorage.getItem("isRealTimeMonitoring");
    return saved === "true";
  });

  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    packetsPerSecond: 0,
    bytesPerSecond: 0,
    activeConnections: 0,
    suspiciousConnections: 0,
    blockedPackets: 0,
    allowedPackets: 0,
  });

  useEffect(() => {
    localStorage.setItem(
      "isNetworkMonitoring",
      isNetworkMonitoring.toString(),
    );
  }, [isNetworkMonitoring]);

  useEffect(() => {
    localStorage.setItem(
      "isRealTimeMonitoring",
      isRealTimeMonitoring.toString(),
    );
  }, [isRealTimeMonitoring]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isNetworkMonitoring) {
      setNetworkStats({
        packetsPerSecond: 0,
        bytesPerSecond: 0,
        activeConnections: 0,
        suspiciousConnections: 0,
        blockedPackets: 0,
        allowedPackets: 0,
      });

      interval = setInterval(() => {
        setNetworkStats((prev) => ({
          packetsPerSecond: 0,
          bytesPerSecond: 0,
          activeConnections: 0,
          suspiciousConnections: 0,
          blockedPackets: prev.blockedPackets,
          allowedPackets: prev.allowedPackets,
        }));
      }, 1000);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }

    setNetworkStats({
      packetsPerSecond: 0,
      bytesPerSecond: 0,
      activeConnections: 0,
      suspiciousConnections: 0,
      blockedPackets: 0,
      allowedPackets: 0,
    });
  }, [isNetworkMonitoring]);

  const startNetworkMonitoring = useCallback(() => {
    console.log("Starting network monitoring...");
    setIsNetworkMonitoring(true);
    localStorage.setItem("isNetworkMonitoring", "true");

    setNetworkStats({
      packetsPerSecond: 0,
      bytesPerSecond: 0,
      activeConnections: 0,
      suspiciousConnections: 0,
      blockedPackets: 0,
      allowedPackets: 0,
    });
  }, []);

  const stopNetworkMonitoring = useCallback(() => {
    console.log("Stopping network monitoring...");
    setIsNetworkMonitoring(false);
    localStorage.setItem("isNetworkMonitoring", "false");
  }, []);

  const startRealTimeMonitoring = useCallback(async () => {
    console.log("Starting real-time monitoring...");

    try {
      await packetCapture.startCapture("eth0");
      setIsRealTimeMonitoring(true);
      localStorage.setItem("isRealTimeMonitoring", "true");
    } catch (error) {
      console.error("Failed to start real-time monitoring:", error);
      setIsRealTimeMonitoring(false);
      localStorage.setItem("isRealTimeMonitoring", "false");
      throw error;
    }
  }, []);

  const stopRealTimeMonitoring = useCallback(() => {
    console.log("Stopping real-time monitoring...");

    try {
      packetCapture.stopCapture();
    } catch (error) {
      console.error("Error stopping packet capture:", error);
    } finally {
      setIsRealTimeMonitoring(false);
      localStorage.setItem("isRealTimeMonitoring", "false");
    }
  }, []);

  return (
    <MonitoringContext.Provider
      value={{
        isNetworkMonitoring,
        isRealTimeMonitoring,
        networkStats,
        startNetworkMonitoring,
        stopNetworkMonitoring,
        startRealTimeMonitoring,
        stopRealTimeMonitoring,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

// useMonitoring is intentionally exported alongside MonitoringProvider.
// eslint-disable-next-line react-refresh/only-export-components
export function useMonitoring(): MonitoringContextType {
  const context = useContext(MonitoringContext);

  if (context === undefined) {
    throw new Error(
      "useMonitoring must be used within a MonitoringProvider",
    );
  }

  return context;
}