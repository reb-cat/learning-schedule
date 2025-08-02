export interface ScheduleBlock {
  student: string;
  day: string;
  block?: number;
  start: string;
  end: string;
  subject: string;
  type: string;
  isAssignmentBlock: boolean;
}

export const scheduleData: ScheduleBlock[] = [
  // Abigail's Schedule
  { student: "Abigail", day: "Monday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", block: 2, start: "9:20 AM", end: "10:00 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Monday", start: "10:00 AM", end: "10:10 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", block: 3, start: "10:10 AM", end: "10:45 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Monday", start: "10:45 AM", end: "10:55 AM", subject: "Prep/Load", type: "Prep/Load", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", start: "10:55 AM", end: "11:20 AM", subject: "Travel to Co-op", type: "Travel", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", block: 4, start: "11:20 AM", end: "12:20 PM", subject: "Geometry", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", start: "12:25 PM", end: "12:55 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", block: 5, start: "12:55 PM", end: "1:55 PM", subject: "Baking (Option 2)", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", start: "2:00 PM", end: "2:30 PM", subject: "Travel Home", type: "Travel", isAssignmentBlock: false },
  { student: "Abigail", day: "Monday", block: 6, start: "2:30 PM", end: "3:00 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },

  { student: "Abigail", day: "Tuesday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Abigail", day: "Tuesday", block: 2, start: "9:20 AM", end: "10:00 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Tuesday", start: "10:00 AM", end: "10:10 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Tuesday", block: 3, start: "10:10 AM", end: "10:45 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Tuesday", block: 4, start: "10:45 AM", end: "11:20 AM", subject: "Assignment Block 4", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Tuesday", start: "11:20 AM", end: "11:30 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Tuesday", block: 5, start: "11:30 AM", end: "12:05 PM", subject: "Assignment Block 5", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Tuesday", start: "12:05 PM", end: "12:35 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Abigail", day: "Tuesday", block: 6, start: "12:35 PM", end: "1:15 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Tuesday", block: 7, start: "1:15 PM", end: "1:50 PM", subject: "Assignment Block 7", type: "Assignment", isAssignmentBlock: true },

  { student: "Abigail", day: "Wednesday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Abigail", day: "Wednesday", block: 2, start: "9:20 AM", end: "10:00 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Wednesday", start: "10:00 AM", end: "10:10 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Wednesday", block: 3, start: "10:10 AM", end: "10:45 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Wednesday", block: 4, start: "10:45 AM", end: "11:20 AM", subject: "Assignment Block 4", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Wednesday", start: "11:20 AM", end: "11:30 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Wednesday", block: 5, start: "11:30 AM", end: "12:05 PM", subject: "Assignment Block 5", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Wednesday", start: "12:05 PM", end: "12:35 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Abigail", day: "Wednesday", block: 6, start: "12:35 PM", end: "1:15 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Wednesday", block: 7, start: "1:15 PM", end: "1:50 PM", subject: "Assignment Block 7", type: "Assignment", isAssignmentBlock: true },

  { student: "Abigail", day: "Thursday", block: 1, start: "8:30 AM", end: "8:50 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", block: 2, start: "8:50 AM", end: "9:15 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Thursday", block: 3, start: "9:15 AM", end: "10:15 AM", subject: "American Literature and Composition", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", block: 4, start: "10:20 AM", end: "11:20 AM", subject: "Study Hall", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", start: "11:20 AM", end: "11:30 AM", subject: "Transition", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", block: 5, start: "11:20 AM", end: "12:20 PM", subject: "Geometry", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", start: "12:25 PM", end: "12:55 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", block: 6, start: "12:55 PM", end: "1:55 PM", subject: "Photography", type: "Co-op", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", start: "1:55 PM", end: "2:05 PM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", start: "2:00 PM", end: "2:30 PM", subject: "Travel Home", type: "Travel", isAssignmentBlock: false },
  { student: "Abigail", day: "Thursday", block: 7, start: "2:30 PM", end: "3:00 PM", subject: "Yearbook", type: "Co-op", isAssignmentBlock: false },

  { student: "Abigail", day: "Friday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Abigail", day: "Friday", block: 2, start: "9:20 AM", end: "10:00 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Abigail", day: "Friday", start: "10:00 AM", end: "10:10 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Abigail", day: "Friday", block: 3, start: "10:10 AM", end: "10:45 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },

  // Khalil's Schedule
  { student: "Khalil", day: "Monday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", block: 2, start: "9:20 AM", end: "9:50 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Monday", start: "9:50 AM", end: "10:00 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", block: 3, start: "10:00 AM", end: "10:30 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Monday", start: "10:30 AM", end: "10:40 AM", subject: "Prep/Load", type: "Prep/Load", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", start: "10:40 AM", end: "11:10 AM", subject: "Travel to Co-op", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", start: "11:20 AM", end: "11:50 AM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", block: 4, start: "11:50 AM", end: "12:50 PM", subject: "8th-9th Gr Earth Science", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", block: 5, start: "12:55 PM", end: "1:55 PM", subject: "HS American History", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", start: "2:00 PM", end: "2:30 PM", subject: "Travel Home", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Monday", block: 6, start: "2:30 PM", end: "3:00 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Monday", block: 7, start: "3:30 PM", end: "4:15 PM", subject: "Algebra 1 (Live)", type: "Class", isAssignmentBlock: false },

  { student: "Khalil", day: "Tuesday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", block: 2, start: "9:20 AM", end: "9:50 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Tuesday", start: "9:50 AM", end: "10:00 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", block: 3, start: "10:00 AM", end: "10:30 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Tuesday", start: "10:30 AM", end: "10:50 AM", subject: "Travel to LF", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", block: 4, start: "11:00 AM", end: "11:50 AM", subject: "Learning Fundamentals", type: "LF", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", start: "11:50 AM", end: "12:10 PM", subject: "Travel Home from LF", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", start: "12:10 PM", end: "12:40 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", block: 5, start: "12:40 PM", end: "1:10 PM", subject: "Assignment Block 5", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Tuesday", start: "1:10 PM", end: "1:20 PM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Tuesday", block: 6, start: "1:20 PM", end: "1:50 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Tuesday", block: 7, start: "1:50 PM", end: "2:20 PM", subject: "Assignment Block 7", type: "Assignment", isAssignmentBlock: true },

  { student: "Khalil", day: "Wednesday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", block: 2, start: "9:20 AM", end: "9:50 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Wednesday", start: "9:50 AM", end: "10:00 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", block: 3, start: "10:00 AM", end: "10:30 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Wednesday", start: "10:30 AM", end: "10:50 AM", subject: "Travel to LF", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", block: 4, start: "11:00 AM", end: "11:50 AM", subject: "Learning Fundamentals", type: "LF", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", start: "11:50 AM", end: "12:10 PM", subject: "Travel Home from LF", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", start: "12:10 PM", end: "12:40 PM", subject: "Lunch", type: "Lunch", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", block: 5, start: "12:40 PM", end: "1:10 PM", subject: "Assignment Block 5", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Wednesday", start: "1:10 PM", end: "1:20 PM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Wednesday", block: 6, start: "1:20 PM", end: "1:50 PM", subject: "Assignment Block 6", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Wednesday", block: 7, start: "1:50 PM", end: "2:20 PM", subject: "Assignment Block 7", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Wednesday", block: 8, start: "3:30 PM", end: "4:15 PM", subject: "Algebra 1 (Live)", type: "Live", isAssignmentBlock: false },

  { student: "Khalil", day: "Thursday", block: 1, start: "8:30 AM", end: "8:50 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", block: 2, start: "8:50 AM", end: "9:15 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Thursday", block: 3, start: "9:15 AM", end: "10:15 AM", subject: "Health", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", block: 4, start: "10:20 AM", end: "11:20 AM", subject: "Study Hall", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", start: "11:20 AM", end: "11:30 AM", subject: "Transition", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", start: "11:30 AM", end: "11:40 AM", subject: "Prep/Load", type: "Prep/Load", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", start: "11:40 AM", end: "12:10 PM", subject: "Travel to Co-op", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", block: 5, start: "11:50 AM", end: "12:50 PM", subject: "Study Hall", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", block: 6, start: "12:55 PM", end: "1:55 PM", subject: "HS Art & The Bible", type: "Co-op", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", start: "2:00 PM", end: "2:30 PM", subject: "Travel Home", type: "Travel", isAssignmentBlock: false },
  { student: "Khalil", day: "Thursday", block: 7, start: "2:30 PM", end: "3:00 PM", subject: "English Fundamentals", type: "Co-op", isAssignmentBlock: false },

  { student: "Khalil", day: "Friday", block: 1, start: "9:00 AM", end: "9:20 AM", subject: "Bible", type: "Bible", isAssignmentBlock: false },
  { student: "Khalil", day: "Friday", block: 2, start: "9:20 AM", end: "9:50 AM", subject: "Assignment Block 2", type: "Assignment", isAssignmentBlock: true },
  { student: "Khalil", day: "Friday", start: "9:50 AM", end: "10:00 AM", subject: "Movement", type: "Movement", isAssignmentBlock: false },
  { student: "Khalil", day: "Friday", block: 3, start: "10:00 AM", end: "10:30 AM", subject: "Assignment Block 3", type: "Assignment", isAssignmentBlock: true },
];

export const getScheduleForStudentAndDay = (student: string, day: string): ScheduleBlock[] => {
  return scheduleData.filter(block => block.student === student && block.day === day);
};

export const getCurrentDayName = (): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};