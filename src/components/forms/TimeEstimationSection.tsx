import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react';

interface TimeEstimationSectionProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeEstimationSection({ value, onChange }: TimeEstimationSectionProps) {
  const timeCategories = [
    { id: 'quick', label: 'Quick', range: '15-30min', value: 30 },
    { id: 'standard', label: 'Standard', range: '45-90min', value: 60 },
    { id: 'extended', label: 'Extended', range: '2-4hrs', value: 180 },
    { id: 'full-day', label: 'Full Day', range: '24hrs', value: 1440 }
  ];

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes === 1440) return `1 day`;
    if (minutes < 480) return `${Math.round(minutes / 60 * 10) / 10} hours`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  const selectedCategory = timeCategories.find(cat => {
    if (cat.id === 'quick') return value <= 30;
    if (cat.id === 'standard') return value > 30 && value <= 120;
    if (cat.id === 'extended') return value > 120 && value < 1440;
    return value >= 1440;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Time Estimate</span>
        <span className="text-sm text-muted-foreground">({formatTime(value)})</span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3">
        {timeCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.value)}
            className={`
              relative flex flex-col items-center justify-center min-h-[3.5rem] flex-1 max-w-[8rem]
              px-4 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-medium text-center break-words overflow-hidden
              transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 
              focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
              ${selectedCategory?.id === category.id 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              }
            `}
          >
            <span className="font-medium leading-none">{category.label}</span>
            <span className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{category.range}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Custom time</span>
          <span className="text-sm font-medium">{formatTime(value)}</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          max={1440}
          min={15}
          step={15}
          className="w-full"
        />
      </div>
    </div>
  );
}