import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, Eye, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const QuickActionsBar = () => {
  const { toast } = useToast();

  const handleSyncCanvas = () => {
    toast({
      title: "Canvas Sync Started",
      description: "Syncing assignments from Canvas...",
    });
  };

  const handleViewSchedule = () => {
    toast({
      title: "Schedule View",
      description: "Opening today's schedule...",
    });
  };

  const handleTodaysOverview = () => {
    const todaySection = document.getElementById('todays-progress');
    todaySection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmergencyHelp = () => {
    toast({
      title: "Emergency Help",
      description: "Contact options: Call (555) 123-4567 or email help@school.edu",
    });
  };

  return (
    <div className="flex gap-3 mb-6 p-4 bg-card rounded-lg border">
      <Button onClick={handleSyncCanvas} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Sync Canvas
      </Button>
      
      <Button onClick={handleViewSchedule} variant="outline" size="sm">
        <Calendar className="h-4 w-4 mr-2" />
        View Schedule
      </Button>
      
      <Button onClick={handleTodaysOverview} variant="outline" size="sm">
        <Eye className="h-4 w-4 mr-2" />
        Today's Overview
      </Button>
      
      <Button onClick={handleEmergencyHelp} variant="outline" size="sm">
        <HelpCircle className="h-4 w-4 mr-2" />
        Emergency Help
      </Button>
    </div>
  );
};