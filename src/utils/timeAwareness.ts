/**
 * Time awareness utilities for the scheduler
 * Prevents scheduling assignments in blocks that have already passed
 */

import { format } from 'date-fns';
import { ScheduleBlock } from '@/data/scheduleData';

interface TimeInfo {
  hours: number;
  minutes: number;
}

/**
 * Parse time string like "9:20 AM" into hours and minutes in 24-hour format
 */
export function parseTimeString(timeStr: string): TimeInfo {
  const [time, period] = timeStr.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Check if a block has already passed based on current time
 */
export function isBlockInPast(blockStartTime: string, currentTime: Date = new Date()): boolean {
  const blockTime = parseTimeString(blockStartTime);
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();

  // If block starts earlier than current time, it's in the past
  if (blockTime.hours < currentHours) {
    return true;
  }
  
  if (blockTime.hours === currentHours && blockTime.minutes < currentMinutes) {
    return true;
  }

  return false;
}

/**
 * Filter out blocks that have already passed for today
 */
export function filterPastBlocks(
  blocks: ScheduleBlock[], 
  currentDate: Date = new Date()
): ScheduleBlock[] {
  const today = format(currentDate, 'yyyy-MM-dd');
  const todayStr = format(currentDate, 'EEEE'); // Get day name like "Monday"

  return blocks.filter(block => {
    // For blocks scheduled for today, check if they've passed
    if (block.day === todayStr) {
      return !isBlockInPast(block.start, currentDate);
    }
    
    // Keep all blocks for future days
    return true;
  });
}

/**
 * Auto-adjust date range when all blocks for selected date have passed
 */
export function getAdjustedDateRange(
  selectedRange: string,
  selectedDate: Date | null,
  currentTime: Date = new Date()
): { adjustedRange: string; adjustedDate: Date | null; needsAdjustment: boolean } {
  const hours = currentTime.getHours();
  
  // After 8 PM, suggest tomorrow for "today" selections
  if (hours >= 20 && selectedRange === 'today') {
    const tomorrow = new Date(currentTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      adjustedRange: 'custom',
      adjustedDate: tomorrow,
      needsAdjustment: true
    };
  }
  
  // If custom date is today and all blocks have passed, suggest tomorrow
  if (selectedRange === 'custom' && selectedDate) {
    const today = format(currentTime, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (selectedDateStr === today && hours >= 20) {
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        adjustedRange: 'custom',
        adjustedDate: tomorrow,
        needsAdjustment: true
      };
    }
  }
  
  return {
    adjustedRange: selectedRange,
    adjustedDate: selectedDate,
    needsAdjustment: false
  };
}

/**
 * Check if all today's assignment blocks have passed
 */
export function allTodaysBlocksPassed(
  studentName: string, 
  allBlocks: ScheduleBlock[], 
  currentTime: Date = new Date()
): boolean {
  const todayStr = format(currentTime, 'EEEE');
  
  const todaysAssignmentBlocks = allBlocks.filter(
    block => block.student === studentName && 
             block.day === todayStr && 
             block.isAssignmentBlock
  );

  if (todaysAssignmentBlocks.length === 0) {
    return true; // No blocks today means all have "passed"
  }

  return todaysAssignmentBlocks.every(block => isBlockInPast(block.start, currentTime));
}

/**
 * Get smart default date range based on current time
 */
export function getSmartDefaultRange(currentTime: Date = new Date()): 'today' | 'next3days' | 'nextweek' {
  const hours = currentTime.getHours();
  
  // After 8 PM: Default to next 3 days (skip today entirely)
  if (hours >= 20) {
    return 'next3days';
  }
  
  // After 3 PM: Default to tomorrow by using next 3 days
  if (hours >= 15) {
    return 'next3days';
  }
  
  // Before 3 PM: Default to today
  return 'today';
}

/**
 * Check if current time is after a certain threshold for scheduling restrictions
 */
export function shouldRestrictToFutureDates(currentTime: Date = new Date()): boolean {
  const hours = currentTime.getHours();
  return hours >= 20; // After 8 PM, only allow future date scheduling
}

/**
 * Generate a warning message when all today's blocks have passed
 */
export function generatePassedBlocksWarning(
  studentName: string,
  allBlocks: ScheduleBlock[],
  currentTime: Date = new Date()
): string | null {
  if (allTodaysBlocksPassed(studentName, allBlocks, currentTime)) {
    const timeStr = format(currentTime, 'h:mm a');
    return `All blocks for today have passed (current time: ${timeStr}). Scheduling for tomorrow instead.`;
  }
  return null;
}

/**
 * Get formatted current time for display
 */
export function getCurrentTimeDisplay(currentTime: Date = new Date()): string {
  return format(currentTime, 'h:mm a, EEEE, MMMM d');
}
