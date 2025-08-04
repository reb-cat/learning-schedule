import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AbigailDashboard from "./pages/AbigailDashboard";
import KhalilDashboard from "./pages/KhalilDashboard";
import AdminSetup from "./pages/AdminSetup";
import ParentDashboard from "./pages/ParentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log('🚀 App component is loading...');
  console.log('🔍 Checking if components render...');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/abigail" element={<div style={{padding: '20px', background: 'orange', color: 'white'}}>Abigail Page Test</div>} />
            <Route path="/khalil" element={<div style={{padding: '20px', background: 'red', color: 'white'}}>Khalil Page Test</div>} />
            <Route path="/admin" element={<div style={{padding: '20px', background: 'blue', color: 'white'}}>Admin Page Test</div>} />
            <Route path="/parent" element={<div style={{padding: '20px', background: 'green', color: 'white'}}>Parent Page Test</div>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<div style={{padding: '20px', background: 'gray', color: 'white'}}>404 Page Test</div>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
