import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CoopAttendanceCardProps {
  blockTitle: string;
  startTime: string;
  endTime: string;
  studentName: string;
  onAttendanceMarked?: () => void;
}

export const CoopAttendanceCard = ({
  blockTitle,
  startTime,
  endTime,
  studentName,
  onAttendanceMarked
}: CoopAttendanceCardProps) => {
  const [isAttended, setIsAttended] = useState(false);
  const [notes, setNotes] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const { toast } = useToast();

  const handleMarkAttended = async () => {
    setIsMarking(true);
    try {
      // Store attendance locally for now - could be enhanced to store in database
      setIsAttended(true);
      
      toast({
        title: "Attendance Marked",
        description: `${blockTitle} attendance recorded`,
      });
      
      onAttendanceMarked?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsMarking(false);
    }
  };

  const getIcon = () => {
    if (blockTitle.toLowerCase().includes('travel')) {
      return <MapPin className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getDescription = () => {
    if (blockTitle.toLowerCase().includes('travel to')) {
      return "Getting ready and traveling to co-op location";
    }
    if (blockTitle.toLowerCase().includes('prep') || blockTitle.toLowerCase().includes('load')) {
      return "Preparing materials and loading equipment";
    }
    if (blockTitle.toLowerCase().includes('travel home')) {
      return "Packing up and traveling home from co-op";
    }
    return "Co-op activity block";
  };

  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getIcon()}
            {blockTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {startTime} - {endTime}
            </Badge>
            {isAttended && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Attended
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getDescription()}
        </p>

        {!isAttended ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Mark attendance when this activity is completed
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional):</label>
              <Textarea
                placeholder="Any notes about this activity..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20"
              />
            </div>

            <Button 
              onClick={handleMarkAttended}
              disabled={isMarking}
              className="w-full"
            >
              {isMarking ? "Marking..." : "Mark as Attended"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Attendance recorded successfully!
              </span>
            </div>
            
            {notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};