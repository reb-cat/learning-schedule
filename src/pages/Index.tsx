// Update this page (the content is just a fallback if you fail to update the page)

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  // INDEX RENDER DEBUG - SIMPLIFIED TO PREVENT LOOP
  console.log('📱 Index page render');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Learning Dashboard</h1>
          <p className="text-lg text-muted-foreground">Choose your workspace</p>
        </div>
        
        <div className="space-y-4">
          <Link to="/abigail" className="block">
            <Button 
              variant="default" 
              size="lg" 
              className="w-full h-16 text-lg font-semibold"
            >
              Abigail's Dashboard
            </Button>
          </Link>
          
          <Link to="/khalil" className="block">
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full h-16 text-lg font-semibold"
            >
              Khalil's Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
