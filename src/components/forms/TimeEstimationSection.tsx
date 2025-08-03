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
    { id: 'full-day', label: 'Full/Multi-day', range: '4+ hrs', value: 480 }
  ];

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 480) return `${Math.round(minutes / 60 * 10) / 10} hours`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  const selectedCategory = timeCategories.find(cat => {
    if (cat.id === 'quick') return value <= 30;
    if (cat.id === 'standard') return value > 30 && value <= 120;
    if (cat.id === 'extended') return value > 120 && value <= 480;
    return value > 480;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Time Estimate</span>
        <span className="text-sm text-muted-foreground">({formatTime(value)})</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {timeCategories.map((category) => (
          <Button
            key={category.id}
            type="button"
            variant={selectedCategory?.id === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(category.value)}
            className="flex flex-col h-auto py-3"
          >
            <span className="font-medium">{category.label}</span>
            <span className="text-xs opacity-70">{category.range}</span>
          </Button>
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