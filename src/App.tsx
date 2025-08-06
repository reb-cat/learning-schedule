import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import SafeAbigailDashboard from "./pages/SafeAbigailDashboard";
import SafeKhalilDashboard from "./pages/SafeKhalilDashboard";
import AdminSetup from "./pages/AdminSetup";
import ParentDashboard from "./pages/ParentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
    },
  },
});

const App = () => {
  console.log('🔴 APP RENDER', window.location.pathname);
  console.log('🚀 App component is loading...');
  console.log('🔍 Checking if components render...');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/abigail" element={<SafeAbigailDashboard />} />
              <Route path="/khalil" element={<SafeKhalilDashboard />} />
              <Route path="/admin" element={<AdminSetup />} />
              <Route path="/parent" element={<ParentDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
