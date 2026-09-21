import { Shield, Activity, Database, Settings, BarChart3, AlertTriangle, Network, LogOut, User, Eye, Syringe } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { user, signOut } = useAuth();
  
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "threats", label: "Threat Detection", icon: Shield },
    { id: "realtime", label: "Real-Time Monitor", icon: Eye },
    { id: "packets", label: "Packet Analyzer", icon: Network },
    { id: "injection", label: "Threat Injection", icon: Syringe },
    { id: "network", label: "Network Monitor", icon: Network },
    { id: "logs", label: "Logs Explorer", icon: AlertTriangle },
    { id: "database", label: "Database", icon: Database },
    { id: "settings", label: "Configuration", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Shield className="h-8 w-8 text-primary cyber-glow" />
                <div className="absolute inset-0 animate-pulse">
                  <Shield className="h-8 w-8 text-primary/30" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-cyber">
                  CyberDefense Pro
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-Time Threat Detection System
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Card className="px-3 py-2 bg-success/10 border-success/20">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                  <span className="text-sm text-success-foreground">System Active</span>
                </div>
              </Card>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.full_name || user?.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onTabChange("settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    activeTab === item.id 
                      ? "bg-primary text-primary-foreground cyber-glow" 
                      : "hover:bg-secondary/50"
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;