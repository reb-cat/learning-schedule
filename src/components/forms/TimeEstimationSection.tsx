import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TimeEstimationSectionProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeEstimationSection({ value, onChange }: TimeEstimationSectionProps) {
  const [timeInput, setTimeInput] = useState('');
  const [isMultiDay, setIsMultiDay] = useState(value >= 1440);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes >= 1440) return `Multi-day task`;
    if (minutes < 480) return `${Math.round(minutes / 60 * 10) / 10} hours`;
    return `${Math.round(minutes / 60)} hours`;
  };

  const parseTimeInput = (input: string): number => {
    const cleanInput = input.toLowerCase().trim();
    
    // Match patterns like "2h", "2 hours", "45min", "45 minutes", "1.5h", etc.
    const hourMatch = cleanInput.match(/(\d+\.?\d*)\s*h(?:ours?)?/);
    const minMatch = cleanInput.match(/(\d+)\s*m(?:in(?:utes?)?)?/);
    
    let totalMinutes = 0;
    
    if (hourMatch) {
      totalMinutes += parseFloat(hourMatch[1]) * 60;
    }
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1]);
    }
    
    // If no pattern matched, try to parse as just a number (assume hours)
    if (totalMinutes === 0 && /^\d+\.?\d*$/.test(cleanInput)) {
      totalMinutes = parseFloat(cleanInput) * 60;
    }
    
    return Math.max(15, Math.round(totalMinutes / 15) * 15); // Round to nearest 15 minutes, min 15
  };

  const handleTimeInputChange = (input: string) => {
    setTimeInput(input);
    if (input.trim()) {
      const minutes = parseTimeInput(input);
      if (minutes > 0) {
        onChange(minutes);
      }
    }
  };

  const handleMultiDayToggle = (checked: boolean) => {
    setIsMultiDay(checked);
    if (checked) {
      onChange(1440); // 1 day minimum for multi-day
      setTimeInput('');
    } else {
      onChange(60); // Default to 1 hour
      setTimeInput('1 hour');
    }
  };

  // Update timeInput when value changes externally
  useEffect(() => {
    if (value >= 1440) {
      setIsMultiDay(true);
      setTimeInput('');
    } else {
      setIsMultiDay(false);
      if (value === 60) setTimeInput('1 hour');
      else if (value === 30) setTimeInput('30 min');
      else if (value === 90) setTimeInput('1.5 hours');
      else if (value === 120) setTimeInput('2 hours');
      else if (value === 180) setTimeInput('3 hours');
      else setTimeInput(`${value} min`);
    }
  }, [value]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Time Estimate</span>
        <span className="text-sm text-muted-foreground">({formatTime(value)})</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Multi-day task</span>
          <Switch
            checked={isMultiDay}
            onCheckedChange={handleMultiDayToggle}
          />
        </div>
        
        {!isMultiDay && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Enter time estimate
            </label>
            <Input
              placeholder="e.g., 2 hours, 45 min, 1.5h"
              value={timeInput}
              onChange={(e) => handleTimeInputChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}