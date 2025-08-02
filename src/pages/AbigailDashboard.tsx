import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const AbigailDashboard = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home size={16} />
              Home
            </Button>
          </Link>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Your learning space is being set up
          </h2>
          <p className="text-muted-foreground">
            Soon you'll see your assignments and schedule here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AbigailDashboard;