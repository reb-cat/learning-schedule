import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TimeEstimationSectionProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeEstimationSection({ value, onChange }: TimeEstimationSectionProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const timeOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '1 hour', value: 60 },
    { label: '1.5 hours', value: 90 },
    { label: '2 hours', value: 120 },
    { label: '3 hours', value: 180 },
    { label: '4 hours', value: 240 },
    { label: 'Half day (4 hours)', value: 240 },
    { label: 'Full day (8 hours)', value: 480 },
    { label: 'Multi-day', value: 1440 },
    { label: 'Other', value: -1 }
  ];

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

  const getCurrentSelectValue = () => {
    const matchingOption = timeOptions.find(option => option.value === value && option.value !== -1);
    if (matchingOption) {
      return matchingOption.value.toString();
    }
    return '-1'; // "Other"
  };

  const handleSelectChange = (selectedValue: string) => {
    const numValue = parseInt(selectedValue);
    
    if (numValue === -1) {
      // "Other" selected
      setShowCustomInput(true);
      if (customInput.trim()) {
        const parsedMinutes = parseTimeInput(customInput);
        onChange(parsedMinutes);
      }
    } else {
      // Preset option selected
      setShowCustomInput(false);
      onChange(numValue);
    }
  };

  const handleCustomInputChange = (input: string) => {
    setCustomInput(input);
    if (input.trim()) {
      const minutes = parseTimeInput(input);
      if (minutes > 0) {
        onChange(minutes);
      }
    }
  };

  // Update showCustomInput and customInput when value changes externally
  useEffect(() => {
    const matchingOption = timeOptions.find(option => option.value === value && option.value !== -1);
    if (!matchingOption && value > 0) {
      setShowCustomInput(true);
      if (value === 30) setCustomInput('30 minutes');
      else if (value === 60) setCustomInput('1 hour');
      else if (value === 90) setCustomInput('1.5 hours');
      else if (value === 120) setCustomInput('2 hours');
      else if (value === 180) setCustomInput('3 hours');
      else setCustomInput(`${value} minutes`);
    } else {
      setShowCustomInput(false);
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
        <Select value={getCurrentSelectValue()} onValueChange={handleSelectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select time estimate" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {showCustomInput && (
          <Input
            placeholder="e.g., 2 hours, 45 min, 1.5h"
            value={customInput}
            onChange={(e) => handleCustomInputChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}