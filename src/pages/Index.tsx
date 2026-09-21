import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import EnhancedDashboard from "@/components/EnhancedDashboard";
import ThreatDetection from "@/components/ThreatDetection";
import NetworkMonitorRealtime from "@/components/NetworkMonitorRealtime";
import RealTimeMonitor from "@/components/RealTimeMonitor";
import PacketAnalyzer from "@/components/PacketAnalyzer";
import DatasetUploader from "../components/DatasetUploader";
import MLAnalytics from "@/components/MLAnalytics";
import LogsExplorer from "@/components/LogsExplorer";
import DatabaseViewer from "../components/DatabaseViewer";
import SystemConfiguration from "@/components/SystemConfiguration";
import ThreatInjection from "@/components/ThreatInjection";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading CyberDefense Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <EnhancedDashboard />;
      case "threats":
        return <ThreatDetection />;
      case "realtime":
        return <RealTimeMonitor />;
      case "packets":
        return <PacketAnalyzer />;
      case "injection":
        return <ThreatInjection />;
      case "network":
        return <NetworkMonitorRealtime />;
      case "logs":
        return <LogsExplorer />;
      case "database":
        return <DatabaseViewer />;
      case "settings":
        return <SystemConfiguration />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
