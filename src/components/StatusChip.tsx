import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  Utensils, 
  Activity, 
  Car, 
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Calendar
} from 'lucide-react';

interface StatusChipProps {
  type: 'assignment' | 'co-op' | 'movement' | 'lunch' | 'travel' | 'bible' | 'prep';
  status?: 'pending' | 'completed' | 'need-more-time' | 'stuck' | 'attended' | 'in-progress';
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusChip({ type, status = 'pending', className = '', size = 'md' }: StatusChipProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'assignment':
        return {
          icon: BookOpen,
          label: 'Assignment',
          bgClass: 'bg-assignment-light border-assignment/20 text-assignment-foreground'
        };
      case 'co-op':
        return {
          icon: Users,
          label: 'Co-op Class',
          bgClass: 'bg-appointment-light border-appointment/20 text-appointment-foreground'
        };
      case 'movement':
        return {
          icon: Activity,
          label: 'Movement',
          bgClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        };
      case 'lunch':
        return {
          icon: Utensils,
          label: 'Lunch',
          bgClass: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200'
        };
      case 'travel':
        return {
          icon: Car,
          label: 'Travel',
          bgClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
        };
      case 'bible':
        return {
          icon: BookOpen,
          label: 'Bible',
          bgClass: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200'
        };
      case 'prep':
        return {
          icon: Calendar,
          label: 'Prep',
          bgClass: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200'
        };
      default:
        return {
          icon: MoreHorizontal,
          label: 'Block',
          bgClass: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200'
        };
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          bgClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        };
      case 'need-more-time':
        return {
          icon: Clock,
          label: 'Need More Time',
          bgClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
        };
      case 'stuck':
        return {
          icon: AlertTriangle,
          label: 'Need Help',
          bgClass: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        };
      case 'attended':
        return {
          icon: CheckCircle,
          label: 'Attended',
          bgClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
        };
      case 'in-progress':
        return {
          icon: Clock,
          label: 'In Progress',
          bgClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
        };
      case 'pending':
      default:
        return null;
    }
  };

  const typeConfig = getTypeConfig();
  const statusConfig = getStatusConfig();
  
  // If we have a status, show status chip, otherwise show type chip
  const config = statusConfig || typeConfig;
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge 
      variant="outline" 
      className={`${config.bgClass} ${textSize} font-medium border ${className}`}
    >
      <Icon className={`${sizeClasses} mr-1`} />
      {config.label}
    </Badge>
  );
}