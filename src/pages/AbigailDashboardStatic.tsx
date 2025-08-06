import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";

// EMERGENCY STATIC DASHBOARD - NO HOOKS, NO DATABASE CALLS
const AbigailDashboardStatic = () => {
  console.log('🛡️ Static Abigail Dashboard - No hooks, no database calls');
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Abigail's Dashboard</h1>
            <p className="text-muted-foreground">Static Mode - Emergency Fallback</p>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Emergency Status */}
        <Card className="mb-6 border-yellow-500">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-yellow-600">Emergency Static Mode</h2>
              <p className="text-muted-foreground mb-4">
                Dashboard is running in static mode to prevent authentication loops.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/abigail">
                  <Button variant="outline">Try Normal Dashboard</Button>
                </Link>
                <Button variant="secondary" onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}>
                  Clear Cache & Reload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Static Schedule Display */}
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
              <div className="space-y-2">
                <div className="p-3 border rounded">
                  <strong>Block 1 (8:00-9:30):</strong> No assignment loaded
                </div>
                <div className="p-3 border rounded">
                  <strong>Block 2 (9:40-11:10):</strong> No assignment loaded
                </div>
                <div className="p-3 border rounded">
                  <strong>Block 3 (11:20-12:50):</strong> No assignment loaded
                </div>
                <div className="p-3 border rounded">
                  <strong>Block 4 (1:40-3:10):</strong> No assignment loaded
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AbigailDashboardStatic;