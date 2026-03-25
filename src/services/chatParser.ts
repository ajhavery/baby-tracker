import { FeedEntry, DiaperEntry, GrowthEntry, TaskCompletion } from '../types';
import { generateId, formatDate } from '../utils/helpers';
import {
  addFeed, addDiaper, addGrowthRecord,
  getTasks, addTaskCompletion, getTaskCompletionsByDate,
  addVaccination,
} from '../storage';

export interface ParseResult {
  success: boolean;
  type: 'feed_expressed' | 'feed_latched' | 'diaper' | 'growth' | 'task' | 'vaccination' | 'unknown';
  message: string;
  data?: any;
}

// Parse time like "6:10 pm", "18:10", "6pm", "6:10pm", "6:10 AM"
function parseTime(str: string): string | null {
  str = str.trim().toLowerCase().replace(/\s+/g, '');

  // "6:10pm" or "6:10am"
  let match = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // "6pm" or "6am"
  match = str.match(/^(\d{1,2})\s*(am|pm)$/);
  if (match) {
    let h = parseInt(match[1]);
    const ampm = match[2];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:00`;
  }

  // "18:10" (24h)
  match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

// Parse date like "today", "yesterday", "23 mar", "2026-03-23", "march 23"
function parseDate(str: string): string {
  str = str.trim().toLowerCase();
  const today = new Date();

  if (str === 'today' || str === '') return formatDate(today);
  if (str === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  // "23 mar" or "mar 23" or "23 march"
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };

  for (const [name, monthIdx] of Object.entries(months)) {
    const re1 = new RegExp(`(\\d{1,2})\\s*${name}`);
    const re2 = new RegExp(`${name}\\s*(\\d{1,2})`);
    let m = str.match(re1) || str.match(re2);
    if (m) {
      const d = new Date(today.getFullYear(), monthIdx, parseInt(m[1]));
      return formatDate(d);
    }
  }

  // ISO date
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

  return formatDate(today);
}

// Extract time ranges like "from 6:10 pm to 6:30 pm" or "6:10pm - 6:30pm"
function extractTimeRange(text: string): { start: string; end: string } | null {
  const patterns = [
    /from\s+(\d{1,2}[:\s]?\d{0,2}\s*(?:am|pm)?)\s*(?:to|till|until|-)\s*(\d{1,2}[:\s]?\d{0,2}\s*(?:am|pm)?)/i,
    /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*(?:to|till|until|-)\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
    /started?\s+(?:at\s+)?(\d{1,2}[:\s]?\d{0,2}\s*(?:am|pm)?)\s*(?:stopped?|ended?|to|till)\s*(?:at\s+)?(\d{1,2}[:\s]?\d{0,2}\s*(?:am|pm)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const start = parseTime(match[1]);
      const end = parseTime(match[2]);
      if (start && end) return { start, end };
    }
  }
  return null;
}

// Extract a single time like "at 9am" or "at 9:30 pm"
function extractSingleTime(text: string): string | null {
  const match = text.match(/(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/i);
  if (match) return parseTime(match[1]);
  return null;
}

// Extract amount like "80ml", "80 ml", "55 mL"
function extractAmount(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:ml|mL|ML)/i);
  return match ? parseInt(match[1]) : null;
}

// Extract duration like "5 mins", "10 minutes", "5m"
function extractDuration(text: string): number | null {
  const match = text.match(/(?:for\s+)?(\d+)\s*(?:min(?:ute)?s?|m\b)/i);
  return match ? parseInt(match[1]) : null;
}

// Extract weight
function extractWeight(text: string): number | null {
  const match = text.match(/(\d+\.?\d*)\s*(?:kg|kgs|kilos?)/i);
  return match ? parseFloat(match[1]) : null;
}

// Extract height
function extractHeight(text: string): number | null {
  const match = text.match(/(\d+\.?\d*)\s*(?:cm|centimeters?)\b/i);
  return match ? parseFloat(match[1]) : null;
}

// Extract head circumference
function extractHeadCirc(text: string): number | null {
  const match = text.match(/(?:head|hc)\s*(?:circumference)?\s*[:=]?\s*(\d+\.?\d*)\s*(?:cm)?/i);
  return match ? parseFloat(match[1]) : null;
}

export async function parseAndSave(input: string): Promise<ParseResult> {
  const text = input.trim();
  if (!text) return { success: false, type: 'unknown', message: 'Please type something' };

  const lower = text.toLowerCase();
  const today = formatDate(new Date());
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // ─── LATCHING / BREASTFEEDING ───
  if (/\b(latch|latched|breastfed?|breastfeeding|nursing|nursed|bf)\b/i.test(lower)) {
    const timeRange = extractTimeRange(text);
    const duration = extractDuration(text);
    const singleTime = extractSingleTime(text);

    let startTime = timeRange?.start || singleTime || currentTime;
    let endTime = timeRange?.end || undefined;
    let mins = duration || undefined;

    if (startTime && endTime && !mins) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
    }

    if (startTime && mins && !endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const totalMins = sh * 60 + sm + mins;
      endTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;
    }

    const entry: FeedEntry = {
      id: generateId(),
      date: today,
      time: startTime,
      type: 'latched',
      startTime,
      endTime,
      durationMinutes: mins,
    };

    await addFeed(entry);
    const durationText = mins ? `${mins} mins` : '';
    const timeText = endTime ? `${startTime} - ${endTime}` : `at ${startTime}`;
    return {
      success: true,
      type: 'feed_latched',
      message: `Added latching session ${timeText}${durationText ? ` (${durationText})` : ''}`,
      data: entry,
    };
  }

  // ─── EXPRESSED MILK ───
  if (/\b(expressed|bottle|pumped|formula|milk)\b/i.test(lower) || extractAmount(text)) {
    const amount = extractAmount(text);
    if (amount) {
      const time = extractSingleTime(text) || currentTime;
      const entry: FeedEntry = {
        id: generateId(),
        date: today,
        time,
        type: 'expressed',
        amountMl: amount,
      };
      await addFeed(entry);
      return {
        success: true,
        type: 'feed_expressed',
        message: `Added ${amount} mL expressed milk at ${time}`,
        data: entry,
      };
    }
  }

  // ─── DIAPER ───
  if (/\b(urine|pee|peed|wet|potty|poop|pooped|stool|diaper|nappy|both)\b/i.test(lower)) {
    let diaperType: 'urine' | 'potty' | 'both' = 'urine';
    if (/\b(both|pee.*poop|poop.*pee|urine.*potty|potty.*urine|wet.*stool|stool.*wet)\b/i.test(lower)) {
      diaperType = 'both';
    } else if (/\b(potty|poop|pooped|stool)\b/i.test(lower)) {
      diaperType = 'potty';
    }

    const time = extractSingleTime(text) || currentTime;
    const entry: DiaperEntry = {
      id: generateId(),
      date: today,
      time,
      type: diaperType,
    };
    await addDiaper(entry);
    const label = diaperType === 'urine' ? 'Urine' : diaperType === 'potty' ? 'Potty' : 'Urine + Potty';
    return {
      success: true,
      type: 'diaper',
      message: `Added ${label} diaper change at ${time}`,
      data: entry,
    };
  }

  // ─── GROWTH ───
  const weight = extractWeight(text);
  const height = extractHeight(text);
  const headCirc = extractHeadCirc(text);

  if (weight || height || headCirc) {
    const entry: GrowthEntry = {
      id: generateId(),
      date: today,
      weightKg: weight || undefined,
      heightCm: height || undefined,
      headCircumferenceCm: headCirc || undefined,
    };
    await addGrowthRecord(entry);
    const parts: string[] = [];
    if (weight) parts.push(`${weight} kg`);
    if (height) parts.push(`${height} cm`);
    if (headCirc) parts.push(`HC ${headCirc} cm`);
    return {
      success: true,
      type: 'growth',
      message: `Added growth record: ${parts.join(', ')}`,
      data: entry,
    };
  }

  // ─── TASK COMPLETION ───
  if (/\b(done|gave|given|completed|administered|finished)\b/i.test(lower)) {
    const tasks = await getTasks();
    const completions = await getTaskCompletionsByDate(today);

    for (const task of tasks) {
      if (!task.active) continue;
      const taskLower = task.name.toLowerCase();
      // Check if input mentions this task
      const words = taskLower.split(/\s+/);
      const mentioned = words.some((w) => w.length > 2 && lower.includes(w));
      if (mentioned && !completions.some((c) => c.taskId === task.id)) {
        const completion: TaskCompletion = {
          id: generateId(),
          taskId: task.id,
          date: today,
          time: currentTime,
        };
        await addTaskCompletion(completion);
        return {
          success: true,
          type: 'task',
          message: `Marked "${task.name}" as done`,
          data: completion,
        };
      }
    }
  }

  // ─── VACCINATION ───
  if (/\b(vaccin|immuniz|shot|jab|bcg|opv|dtap|ipv|hep|hib|rotavirus|pcv|mmr|flu|varicella)\b/i.test(lower)) {
    if (/\b(given|done|administered|got|received|took)\b/i.test(lower)) {
      // Try to extract vaccine name
      const vaccineNames = [
        'BCG', 'OPV-0', 'OPV-1', 'Hepatitis B-1', 'Hepatitis B-2', 'Hepatitis B-3',
        'DTaP-1', 'DTaP-2', 'DTaP-3', 'IPV-1', 'IPV-2', 'IPV-3',
        'Hib-1', 'Hib-2', 'Hib-3', 'Rotavirus-1', 'Rotavirus-2', 'Rotavirus-3',
        'PCV-1', 'PCV-2', 'PCV Booster', 'MMR-1', 'MMR-2', 'MMR-3',
        'Hepatitis A-1', 'Hepatitis A-2', 'Varicella-1', 'Varicella-2',
        'Influenza-1', 'DTaP Booster-1', 'DTaP Booster-2',
        'IPV Booster-1', 'IPV Booster-2', 'Hib Booster',
      ];

      for (const name of vaccineNames) {
        if (lower.includes(name.toLowerCase().replace(/-/g, ' ')) ||
            lower.includes(name.toLowerCase())) {
          await addVaccination({
            id: generateId(),
            vaccineId: name.toLowerCase().replace(/[\s-]+/g, '_'),
            vaccineName: name,
            dateGiven: today,
          });
          return {
            success: true,
            type: 'vaccination',
            message: `Marked ${name} as given today`,
          };
        }
      }

      return {
        success: false,
        type: 'vaccination',
        message: 'Could not identify which vaccine. Try: "BCG given" or "DTaP-1 done"',
      };
    }
  }

  return {
    success: false,
    type: 'unknown',
    message: `I couldn't understand that. Try things like:\n- "latched from 6:10 pm to 6:30 pm"\n- "80ml expressed at 9am"\n- "potty at 3pm"\n- "weight 3.5 kg"\n- "vitamin d done"\n- "BCG given today"`,
  };
}
