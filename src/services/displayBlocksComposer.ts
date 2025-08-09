import { supabase } from "@/integrations/supabase/client";

export type TemplateRow = {
  student_name: string;
  weekday: string;
  block_number: number | null;
  start_time: string; // e.g., "08:00:00"
  end_time: string;   // e.g., "09:00:00"
  subject: string | null;
  block_type: string;
};

export type AssignmentRow = {
  id: string;
  title: string;
  completion_status: string | null;
  due_date: string | null; // timestamp with time zone
  available_on: string | null; // date (YYYY-MM-DD)
  created_at: string; // timestamp
  scheduled_date?: string | null; // optional guard
};

export type DisplayBlock = {
  start: string;
  end: string;
  subject: string | null;
  block?: number | null;
  isAssignmentBlock: boolean;
  block_type: string;
};

export type DisplayEntry = {
  block: DisplayBlock;
  assignment?: AssignmentRow; // present only when filled with a task
};

export type CoopMeta = {
  enabled: boolean;
  startIndex: number; // index of first Co-op block
  travelHomeIndex: number; // index of Travel Home row
  travelHomeEnd: string; // HH:mm[:ss]
  revealAtISO: string; // ISO string for Travel Home end minus 10 minutes in local time
};

export type BuildOptions = {
  overrideDay?: string | null; // e.g., "Tuesday"
  excludeFutureScheduled?: boolean; // optional guard (off by default)
};

function toLocalStartOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateOnlyToLocal(dateStr: string): Date {
  // dateStr like YYYY-MM-DD -> interpret in local TZ at 00:00
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function isDueTodayLocal(dueISO?: string | null, todayStart?: Date): boolean {
  if (!dueISO) return false;
  const due = new Date(dueISO);
  const start = todayStart ? new Date(todayStart) : toLocalStartOfDay();
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return due >= start && due <= end;
}

function formatTimeHHMM(timeStr: string): string {
  // input examples: "08:30:00" or "08:30"
  const [hh = "00", mm = "00"] = timeStr.split(":");
  return `${hh}:${mm}`;
}

export async function buildDisplayEntries(
  studentName: string,
  opts: BuildOptions = {}
): Promise<{ entries: DisplayEntry[]; coopMeta: CoopMeta | null; dayName: string; formattedDate: string }>
{
  const today = toLocalStartOfDay();
  const dayName = (opts.overrideDay || today.toLocaleDateString('en-US', { weekday: 'long' })).trim();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1) Fetch schedule_template rows for student + weekday
  const { data: templateData, error: templateError } = await supabase
    .from('schedule_template')
    .select('student_name,weekday,block_number,start_time,end_time,subject,block_type')
    .eq('student_name', studentName)
    .eq('weekday', dayName)
    .order('block_number', { ascending: true })
    .order('start_time', { ascending: true });

  if (templateError) {
    console.error('buildDisplayEntries: templateError', templateError);
    return { entries: [], coopMeta: null, dayName, formattedDate };
  }

  const template: TemplateRow[] = (templateData || []) as TemplateRow[];

  // 2) Fetch assignments for student
  const { data: asgData, error: asgError } = await supabase
    .from('assignments')
    .select('id,title,completion_status,due_date,available_on,created_at,scheduled_date,subject')
    .eq('student_name', studentName)
    .order('due_date', { ascending: true })
    .limit(500);

  if (asgError) {
    console.error('buildDisplayEntries: assignmentsError', asgError);
  }

  const assignments: AssignmentRow[] = ((asgData || []) as any[]).map(a => ({
    id: String(a.id),
    title: a.title,
    completion_status: a.completion_status,
    due_date: a.due_date,
    available_on: a.available_on,
    created_at: a.created_at,
    scheduled_date: a.scheduled_date,
    // keep subject if present for display hints
    // @ts-ignore
    subject: a.subject
  }));

  // 3) Build eligible = assignments where (available_on is null OR available_on <= today)
  const todayStart = today; // already at 00:00
  const eligible = assignments.filter(a => {
    if (a.available_on) {
      const av = parseDateOnlyToLocal(a.available_on);
      if (av > todayStart) return false;
    }
    if (opts.excludeFutureScheduled && a.scheduled_date) {
      const sd = parseDateOnlyToLocal(a.scheduled_date);
      if (sd > todayStart) return false;
    }
    return true;
  });

  // 4) Build deterministic queue: urgent NMT due today, then not_started sorted by due_date ASC, created_at ASC
  const urgentNMT = eligible
    .filter(a => a.completion_status === 'need_more_time' && isDueTodayLocal(a.due_date, todayStart))
    .sort((a, b) => {
      const ac = new Date(a.created_at).getTime();
      const bc = new Date(b.created_at).getTime();
      return ac - bc;
    });

  const normal = eligible
    .filter(a => (a.completion_status || 'not_started') === 'not_started')
    .sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      const ac = new Date(a.created_at).getTime();
      const bc = new Date(b.created_at).getTime();
      return ac - bc;
    });

  const queue: AssignmentRow[] = [...urgentNMT, ...normal];

  // 5) Fill schedule rows in order
  const entries: DisplayEntry[] = [];
  let coopStartIndex = -1;
  let travelHomeIndex = -1;
  let travelHomeEnd: string | null = null;

  template.forEach((r, idx) => {
    const isAssignmentBlock = r.block_type === 'Assignment';
    const isEmpty = !r.subject || r.subject.trim() === '' || r.subject.trim().toUpperCase() === '[EMPTY]';

    if (coopStartIndex === -1 && r.block_type.toLowerCase() === 'co-op') {
      coopStartIndex = idx;
    }
    if (travelHomeIndex === -1 && (r.subject || '').trim().toLowerCase() === 'travel home') {
      travelHomeIndex = idx;
      travelHomeEnd = r.end_time;
    }

    if (isAssignmentBlock && isEmpty) {
      const next = queue.shift();
      if (next) {
        entries.push({
          block: {
            start: formatTimeHHMM(r.start_time),
            end: formatTimeHHMM(r.end_time),
            subject: next.subject || next.title,
            block: r.block_number,
            isAssignmentBlock: true,
            block_type: r.block_type,
          },
          assignment: next,
        });
      } else {
        // Keep visible as empty/open time
        entries.push({
          block: {
            start: formatTimeHHMM(r.start_time),
            end: formatTimeHHMM(r.end_time),
            subject: '[EMPTY]',
            block: r.block_number,
            isAssignmentBlock: true,
            block_type: r.block_type,
          },
        });
      }
    } else {
      // Fixed or pre-filled rows
      entries.push({
        block: {
          start: formatTimeHHMM(r.start_time),
          end: formatTimeHHMM(r.end_time),
          subject: r.subject,
          block: r.block_number,
          isAssignmentBlock: isAssignmentBlock,
          block_type: r.block_type,
        },
      });
    }
  });

  let coopMeta: CoopMeta | null = null;
  if (coopStartIndex >= 0 && travelHomeIndex >= 0 && travelHomeEnd) {
    // compute revealAt = today at travelHomeEnd minus 10 minutes (local)
    const [hh, mm] = formatTimeHHMM(travelHomeEnd).split(':').map(Number);
    const reveal = new Date(todayStart);
    reveal.setHours(hh || 0, (mm || 0) - 10, 0, 0);
    coopMeta = {
      enabled: true,
      startIndex: coopStartIndex,
      travelHomeIndex,
      travelHomeEnd: formatTimeHHMM(travelHomeEnd),
      revealAtISO: reveal.toISOString(),
    };
  }

  return { entries, coopMeta, dayName, formattedDate };
}
