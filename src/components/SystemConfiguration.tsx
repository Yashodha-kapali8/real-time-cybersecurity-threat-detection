import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Settings, User, Shield, Network, Database, Bell, Save, RotateCcw, TestTube, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "../hooks/use-toast";

const SystemConfiguration = () => {
  const { toast } = useToast();
  
  const [generalSettings, setGeneralSettings] = useState({
    darkMode: true,
    autoRefresh: true,
    showAdvanced: false,
    refreshInterval: "5",
    maxLogRetention: "90",
    systemName: "CyberDefense Pro"
  });

  const [securitySettings, setSecuritySettings] = useState({
    autoBlock: true,
    threatThreshold: "medium",
    enableRealTimeAlerts: true,
    requireTwoFactor: false,
    sessionTimeout: "30",
    passwordComplexity: "high"
  });

  const [networkSettings, setNetworkSettings] = useState({
    monitoringInterface: "eth0",
    captureMode: "promiscuous",
    maxPacketSize: "1500",
    bufferSize: "100",
    enableDeepInspection: true,
    blockSuspiciousTraffic: true
  });

  const [dbSettings, setDbSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    dataRetention: "90",
    enableCompression: true,
    maxConnectionPool: "50"
  });

  const [mlSettings, setMlSettings] = useState({
    modelSensitivity: 0.75,
    alertThreshold: 0.8,
    autoRetrain: true,
    retrainInterval: "weekly",
    enableRealTimeAnalysis: true,
    useGPUAcceleration: false,
    batchSize: 256,
    learningRate: 0.001
  });

  const [captureSettings, setCaptureSettings] = useState({
    captureSpeed: "normal",
    bufferSize: 100, // MB
    maxPacketSize: 1500,
    enableDeepPacketInspection: true,
    captureFilters: "tcp or udp",
    interfaceMode: "promiscuous"
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    slackIntegration: false,
    webhookUrl: "",
    alertEmail: "admin@company.com"
  });

  const handleSaveSettings = (section: string) => {
    toast({
      title: "Settings Saved",
      description: `${section} configuration has been updated successfully`,
    });
  };

  const handleTestConnection = () => {
    toast({
      title: "Connection Test",
      description: "Database connection test completed successfully",
    });
  };

  const handleResetSettings = (section: string) => {
    toast({
      title: "Settings Reset",
      description: `${section} settings have been reset to defaults`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">System Configuration</h2>
        <Badge variant="outline" className="text-primary border-primary/50">
          <Settings className="mr-2 h-3 w-3" />
          Configuration Panel
        </Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="analyzer">Packet Analyzer</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic system preferences and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">System Name</label>
                    <Input
                      value={generalSettings.systemName}
                      onChange={(e) => setGeneralSettings({...generalSettings, systemName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Auto Refresh Interval (seconds)</label>
                    <Select value={generalSettings.refreshInterval} onValueChange={(value) => 
                      setGeneralSettings({...generalSettings, refreshInterval: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 seconds</SelectItem>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Log Retention (days)</label>
                    <Input
                      type="number"
                      value={generalSettings.maxLogRetention}
                      onChange={(e) => setGeneralSettings({...generalSettings, maxLogRetention: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Dark Mode</div>
                      <div className="text-sm text-muted-foreground">Enable dark theme</div>
                    </div>
                    <Switch
                      checked={generalSettings.darkMode}
                      onCheckedChange={(checked) => setGeneralSettings({...generalSettings, darkMode: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Auto Refresh</div>
                      <div className="text-sm text-muted-foreground">Automatically refresh data</div>
                    </div>
                    <Switch
                      checked={generalSettings.autoRefresh}
                      onCheckedChange={(checked) => setGeneralSettings({...generalSettings, autoRefresh: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Show Advanced Features</div>
                      <div className="text-sm text-muted-foreground">Display advanced options</div>
                    </div>
                    <Switch
                      checked={generalSettings.showAdvanced}
                      onCheckedChange={(checked) => setGeneralSettings({...generalSettings, showAdvanced: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("General")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("General")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and threat response settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Threat Response Threshold</label>
                    <Select value={securitySettings.threatThreshold} onValueChange={(value) => 
                      setSecuritySettings({...securitySettings, threatThreshold: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Monitor all activity</SelectItem>
                        <SelectItem value="medium">Medium - Standard protection</SelectItem>
                        <SelectItem value="high">High - Strict filtering</SelectItem>
                        <SelectItem value="critical">Critical - Maximum security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Session Timeout (minutes)</label>
                    <Input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Password Complexity</label>
                    <Select value={securitySettings.passwordComplexity} onValueChange={(value) => 
                      setSecuritySettings({...securitySettings, passwordComplexity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic - 8 characters</SelectItem>
                        <SelectItem value="medium">Medium - 12 chars + symbols</SelectItem>
                        <SelectItem value="high">High - 16 chars + complexity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Auto-block Threats</div>
                      <div className="text-sm text-muted-foreground">Automatically block detected threats</div>
                    </div>
                    <Switch
                      checked={securitySettings.autoBlock}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, autoBlock: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Real-time Alerts</div>
                      <div className="text-sm text-muted-foreground">Send immediate threat notifications</div>
                    </div>
                    <Switch
                      checked={securitySettings.enableRealTimeAlerts}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, enableRealTimeAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Two-Factor Authentication</div>
                      <div className="text-sm text-muted-foreground">Require 2FA for admin access</div>
                    </div>
                    <Switch
                      checked={securitySettings.requireTwoFactor}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireTwoFactor: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Security")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Security Settings
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("Security")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Settings */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="mr-2 h-5 w-5 text-primary" />
                Network Configuration
              </CardTitle>
              <CardDescription>
                Network monitoring and packet capture settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Monitoring Interface</label>
                    <Select value={networkSettings.monitoringInterface} onValueChange={(value) => 
                      setNetworkSettings({...networkSettings, monitoringInterface: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eth0">eth0 - Primary interface</SelectItem>
                        <SelectItem value="eth1">eth1 - Secondary interface</SelectItem>
                        <SelectItem value="wlan0">wlan0 - Wireless interface</SelectItem>
                        <SelectItem value="all">Monitor all interfaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Packet Size (bytes)</label>
                    <Input
                      type="number"
                      value={networkSettings.maxPacketSize}
                      onChange={(e) => setNetworkSettings({...networkSettings, maxPacketSize: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Buffer Size (MB)</label>
                    <Input
                      type="number"
                      value={networkSettings.bufferSize}
                      onChange={(e) => setNetworkSettings({...networkSettings, bufferSize: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Deep Packet Inspection</div>
                      <div className="text-sm text-muted-foreground">Analyze packet payload content</div>
                    </div>
                    <Switch
                      checked={networkSettings.enableDeepInspection}
                      onCheckedChange={(checked) => setNetworkSettings({...networkSettings, enableDeepInspection: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Block Suspicious Traffic</div>
                      <div className="text-sm text-muted-foreground">Automatically block detected threats</div>
                    </div>
                    <Switch
                      checked={networkSettings.blockSuspiciousTraffic}
                      onCheckedChange={(checked) => setNetworkSettings({...networkSettings, blockSuspiciousTraffic: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Network")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Network Settings
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("Network")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packet Analyzer Settings */}
        <TabsContent value="analyzer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="mr-2 h-5 w-5 text-primary" />
                Packet Analyzer Configuration
              </CardTitle>
              <CardDescription>
                Configure real-time packet analysis and threat detection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capture Speed</label>
                    <Select value={captureSettings.captureSpeed} onValueChange={(value) => 
                      setCaptureSettings({...captureSettings, captureSpeed: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow - 1 packet/sec (Low CPU)</SelectItem>
                        <SelectItem value="normal">Normal - 2 packets/sec (Balanced)</SelectItem>
                        <SelectItem value="fast">Fast - 5 packets/sec (High throughput)</SelectItem>
                        <SelectItem value="realtime">Real-time - Maximum speed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buffer Size (MB)</label>
                    <Input
                      type="number"
                      value={captureSettings.bufferSize}
                      onChange={(e) => setCaptureSettings({...captureSettings, bufferSize: parseInt(e.target.value)})}
                      min={50}
                      max={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher buffer prevents packet loss but uses more memory
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Packet Size (bytes)</label>
                    <Input
                      type="number"
                      value={captureSettings.maxPacketSize}
                      onChange={(e) => setCaptureSettings({...captureSettings, maxPacketSize: parseInt(e.target.value)})}
                      min={64}
                      max={65535}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Capture Filters</label>
                    <Input
                      value={captureSettings.captureFilters}
                      onChange={(e) => setCaptureSettings({...captureSettings, captureFilters: e.target.value})}
                      placeholder="tcp or udp"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      BPF syntax: "tcp port 80" or "host 192.168.1.1"
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Deep Packet Inspection</div>
                      <div className="text-sm text-muted-foreground">Analyze packet payload for threats</div>
                    </div>
                    <Switch
                      checked={captureSettings.enableDeepPacketInspection}
                      onCheckedChange={(checked) => setCaptureSettings({...captureSettings, enableDeepPacketInspection: checked})}
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      XGBoost Model Status
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <Badge variant="default">XGBoost</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-mono text-xs">public/models/</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Required Files:</span>
                        <span className="text-xs">4 files (.pkl + .json)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Training Instructions
                    </h4>
                    <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                      <li>Edit training.py with your dataset paths</li>
                      <li>Run: python training.py</li>
                      <li>Copy 4 generated files to public/models/</li>
                      <li>Restart the application</li>
                      <li>Click "Start Capture" to begin detection</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Packet Analyzer")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Analyzer Settings
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("Packet Analyzer")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-primary" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Database backup, retention and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Backup Frequency</label>
                    <Select value={dbSettings.backupFrequency} onValueChange={(value) => 
                      setDbSettings({...dbSettings, backupFrequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly backups</SelectItem>
                        <SelectItem value="daily">Daily backups</SelectItem>
                        <SelectItem value="weekly">Weekly backups</SelectItem>
                        <SelectItem value="monthly">Monthly backups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Retention (days)</label>
                    <Input
                      type="number"
                      value={dbSettings.dataRetention}
                      onChange={(e) => setDbSettings({...dbSettings, dataRetention: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Connection Pool</label>
                    <Input
                      type="number"
                      value={dbSettings.maxConnectionPool}
                      onChange={(e) => setDbSettings({...dbSettings, maxConnectionPool: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Automated Backups</div>
                      <div className="text-sm text-muted-foreground">Schedule automatic database backups</div>
                    </div>
                    <Switch
                      checked={dbSettings.autoBackup}
                      onCheckedChange={(checked) => setDbSettings({...dbSettings, autoBackup: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Enable Compression</div>
                      <div className="text-sm text-muted-foreground">Compress backup files to save space</div>
                    </div>
                    <Switch
                      checked={dbSettings.enableCompression}
                      onCheckedChange={(checked) => setDbSettings({...dbSettings, enableCompression: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Database")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Database Settings
                </Button>
                <Button variant="outline" onClick={handleTestConnection}>
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("Database")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5 text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure alert channels and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Alert Email Address</label>
                    <Input
                      type="email"
                      value={notifications.alertEmail}
                      onChange={(e) => setNotifications({...notifications, alertEmail: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Webhook URL (Optional)</label>
                    <Input
                      type="url"
                      value={notifications.webhookUrl}
                      onChange={(e) => setNotifications({...notifications, webhookUrl: e.target.value})}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Email Alerts</div>
                      <div className="text-sm text-muted-foreground">Send threat alerts via email</div>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">SMS Alerts</div>
                      <div className="text-sm text-muted-foreground">Send critical alerts via SMS</div>
                    </div>
                    <Switch
                      checked={notifications.smsAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, smsAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <div className="font-medium">Slack Integration</div>
                      <div className="text-sm text-muted-foreground">Send alerts to Slack channel</div>
                    </div>
                    <Switch
                      checked={notifications.slackIntegration}
                      onCheckedChange={(checked) => setNotifications({...notifications, slackIntegration: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={() => handleSaveSettings("Notifications")} className="cyber-glow">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
                <Button variant="outline" onClick={() => handleResetSettings("Notifications")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemConfiguration;