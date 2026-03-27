import { FeedEntry, DiaperEntry, GrowthEntry, TaskCompletion } from '../types';
import { generateId, formatDate, nowIST, todayIST, currentTimeIST } from '../utils/helpers';
import {
  addFeed, addDiaper, addGrowthRecord,
  getTasks, addTaskCompletion, getTaskCompletionsByDate,
  addVaccination, getFeedsByDate, getDiapersByDate,
} from '../storage';

export interface ParseResult {
  success: boolean;
  type: 'feed_expressed' | 'feed_latched' | 'diaper' | 'growth' | 'task' | 'vaccination' | 'multi' | 'unknown';
  message: string;
  data?: any;
}

// ─── Time Parsing ───

function parseTime(str: string): string | null {
  str = str.trim().toLowerCase().replace(/\s+/g, '');
  let match = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  match = str.match(/^(\d{1,2})\s*(am|pm)$/);
  if (match) {
    let h = parseInt(match[1]);
    if (match[2] === 'pm' && h < 12) h += 12;
    if (match[2] === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:00`;
  }
  match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return null;
}

// ─── Date Parsing ───

function parseDateFromText(text: string): string {
  const lower = text.toLowerCase();
  const today = nowIST();
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return formatDate(d);
  }
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };
  for (const [name, monthIdx] of Object.entries(months)) {
    const re1 = new RegExp(`(\\d{1,2})\\s*${name}`, 'i');
    const re2 = new RegExp(`${name}\\s*(\\d{1,2})`, 'i');
    const m = lower.match(re1) || lower.match(re2);
    if (m) {
      const d = new Date(today.getFullYear(), monthIdx, parseInt(m[1]));
      return formatDate(d);
    }
  }
  const isoMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  return formatDate(today);
}

// ─── Extractors ───

function extractTimeRange(text: string): { start: string; end: string } | null {
  const patterns = [
    /(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)\s*(?:to|till|until|-)\s*(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)/i,
    /from\s+(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?)\s*(?:to|till|until|-)\s*(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?)/i,
    /started?\s*(?:at\s+)?(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?)\s*[;,]?\s*(?:stopped?|ended?|to|till)\s*(?:at\s+)?(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const start = parseTime(match[1].replace('.', ':'));
      const end = parseTime(match[2].replace('.', ':'));
      if (start && end) return { start, end };
    }
  }
  return null;
}

function extractSingleTime(text: string): string | null {
  // Match patterns like "at 9am", "at 9:30 pm", "4:30 am", standalone times
  const patterns = [
    /(?:at\s+)(\d{1,2}:\d{2}\s*(?:am|pm))/i,
    /(?:at\s+)(\d{1,2}\s*(?:am|pm))/i,
    /(\d{1,2}:\d{2}\s*(?:am|pm))/i,
    /(\d{1,2}\s*(?:am|pm))/i,
    /(\d{1,2}:\d{2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const t = parseTime(match[1]);
      if (t) return t;
    }
  }
  return null;
}

function extractAmount(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:ml|mL|ML)/i);
  return match ? parseInt(match[1]) : null;
}

function extractDuration(text: string): number | null {
  const match = text.match(/(?:for\s+)?(\d+)\s*(?:min(?:ute)?s?|m\b)/i);
  return match ? parseInt(match[1]) : null;
}

function extractWeight(text: string): number | null {
  const match = text.match(/(\d+\.?\d*)\s*(?:kg|kgs|kilos?)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractHeight(text: string): number | null {
  const match = text.match(/(\d+\.?\d*)\s*(?:cm|centimeters?)\b/i);
  return match ? parseFloat(match[1]) : null;
}

function extractHeadCirc(text: string): number | null {
  const match = text.match(/(?:head|hc)\s*(?:circumference)?\s*[:=]?\s*(\d+\.?\d*)\s*(?:cm)?/i);
  return match ? parseFloat(match[1]) : null;
}

// ─── Duplicate detection ───

async function isDuplicateFeed(date: string, time: string, type: string, amountMl?: number): Promise<boolean> {
  const feeds = await getFeedsByDate(date);
  return feeds.some((f) => f.time === time && f.type === type && (type === 'latched' || f.amountMl === amountMl));
}

async function isDuplicateDiaper(date: string, time: string, type: string): Promise<boolean> {
  const diapers = await getDiapersByDate(date);
  return diapers.some((d) => d.time === time && d.type === type);
}

// ─── Parse a single line/entry ───

async function parseSingleEntry(text: string, date: string): Promise<ParseResult> {
  const lower = text.toLowerCase().trim();
  if (!lower || lower.length < 2) return { success: false, type: 'unknown', message: '' };

  const currentTime = currentTimeIST();

  // ─── LATCHING ───
  if (/\b(latch|latched|breastfed?|breastfeeding|nursing|nursed|bf|latches)\b/i.test(lower)) {
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

    if (await isDuplicateFeed(date, startTime, 'latched')) {
      const timeText = endTime ? `${startTime} - ${endTime}` : `at ${startTime}`;
      return { success: true, type: 'feed_latched', message: `Latched ${timeText} (already exists, skipped)` };
    }
    await addFeed({ id: generateId(), date, time: startTime, type: 'latched', startTime, endTime, durationMinutes: mins });
    const durationText = mins ? `${mins} mins` : '';
    const timeText = endTime ? `${startTime} - ${endTime}` : `at ${startTime}`;
    return { success: true, type: 'feed_latched', message: `Latched ${timeText}${durationText ? ` (${durationText})` : ''}` };
  }

  // ─── EXPRESSED / FORMULA MILK ───
  const amount = extractAmount(text);
  const isFormula = /\b(formula)\b/i.test(lower);
  if (amount || /\b(expressed|bottle|pumped|formula)\b/i.test(lower)) {
    if (amount) {
      const time = extractSingleTime(text) || currentTime;
      const feedType = isFormula ? 'formula' as const : 'expressed' as const;
      if (await isDuplicateFeed(date, time, feedType, amount)) {
        return { success: true, type: 'feed_expressed', message: `${amount} mL at ${time} (already exists, skipped)` };
      }
      await addFeed({ id: generateId(), date, time, type: feedType, amountMl: amount });
      const label = isFormula ? 'formula' : 'expressed';
      return { success: true, type: 'feed_expressed', message: `${amount} mL ${label} at ${time}` };
    }
  }

  // ─── DIAPER ───
  if (/\b(urine|pee|peed|wet|potty|poop|pooped|stool|diaper|nappy)\b/i.test(lower)) {
    let diaperType: 'urine' | 'potty' | 'both' = 'urine';
    if (/\b(both|pee.*poop|poop.*pee|urine.*potty|potty.*urine)\b/i.test(lower)) {
      diaperType = 'both';
    } else if (/\b(potty|poop|pooped|stool)\b/i.test(lower)) {
      diaperType = 'potty';
    }
    const time = extractSingleTime(text) || currentTime;
    if (await isDuplicateDiaper(date, time, diaperType)) {
      const label = diaperType === 'urine' ? 'Urine' : diaperType === 'potty' ? 'Potty' : 'Both';
      return { success: true, type: 'diaper', message: `${label} at ${time} (already exists, skipped)` };
    }
    await addDiaper({ id: generateId(), date, time, type: diaperType });
    const label = diaperType === 'urine' ? 'Urine' : diaperType === 'potty' ? 'Potty' : 'Both';
    return { success: true, type: 'diaper', message: `${label} at ${time}` };
  }

  // ─── GROWTH ───
  const weight = extractWeight(text);
  const height = extractHeight(text);
  const headCirc = extractHeadCirc(text);
  if (weight || height || headCirc) {
    await addGrowthRecord({ id: generateId(), date, weightKg: weight || undefined, heightCm: height || undefined, headCircumferenceCm: headCirc || undefined });
    const parts: string[] = [];
    if (weight) parts.push(`${weight} kg`);
    if (height) parts.push(`${height} cm`);
    if (headCirc) parts.push(`HC ${headCirc} cm`);
    return { success: true, type: 'growth', message: `Growth: ${parts.join(', ')}` };
  }

  // ─── TASK COMPLETION ───
  if (/\b(done|gave|given|completed|administered|finished)\b/i.test(lower)) {
    const tasks = await getTasks();
    const completions = await getTaskCompletionsByDate(date);
    for (const task of tasks) {
      if (!task.active) continue;
      const words = task.name.toLowerCase().split(/\s+/);
      const mentioned = words.some((w) => w.length > 2 && lower.includes(w));
      if (mentioned && !completions.some((c) => c.taskId === task.id)) {
        await addTaskCompletion({ id: generateId(), taskId: task.id, date, time: currentTime });
        return { success: true, type: 'task', message: `"${task.name}" done` };
      }
    }
  }

  // ─── VACCINATION ───
  if (/\b(vaccin|immuniz|shot|jab|bcg|opv|dtap|ipv|hep|hib|rotavirus|pcv|mmr|flu|varicella)\b/i.test(lower)) {
    if (/\b(given|done|administered|got|received|took)\b/i.test(lower)) {
      const vaccineNames = [
        'BCG', 'OPV-0', 'OPV-1', 'Hepatitis B-1', 'Hepatitis B-2', 'Hepatitis B-3',
        'DTaP-1', 'DTaP-2', 'DTaP-3', 'IPV-1', 'IPV-2', 'IPV-3',
        'Hib-1', 'Hib-2', 'Hib-3', 'Rotavirus-1', 'Rotavirus-2', 'Rotavirus-3',
        'PCV-1', 'PCV-2', 'PCV Booster', 'MMR-1', 'MMR-2', 'MMR-3',
        'Hepatitis A-1', 'Hepatitis A-2', 'Varicella-1', 'Varicella-2',
        'Influenza-1', 'DTaP Booster-1', 'DTaP Booster-2', 'IPV Booster-1', 'IPV Booster-2', 'Hib Booster',
      ];
      for (const name of vaccineNames) {
        if (lower.includes(name.toLowerCase().replace(/-/g, ' ')) || lower.includes(name.toLowerCase())) {
          await addVaccination({ id: generateId(), vaccineId: name.toLowerCase().replace(/[\s-]+/g, '_'), vaccineName: name, dateGiven: date });
          return { success: true, type: 'vaccination', message: `${name} marked as given` };
        }
      }
    }
  }

  return { success: false, type: 'unknown', message: '' };
}

// ─── Split multi-entry message into individual lines ───

function cleanLine(line: string): string {
  return line
    .replace(/^[\s•\-\*\u2022\u2027\u2043\u25E6\u00B7\u2981\uFE61]+/, '') // strip bullets
    .replace(/\bom\b/gi, 'pm') // fix "om" typo for "pm"
    .replace(/\u2060/g, '') // remove word joiners
    .trim();
}

function splitEntries(text: string): string[] {
  // Split on newlines, bullet points, dashes at start of line, or numbered items
  let lines = text.split(/[\n\r]+/).map((l) => cleanLine(l)).filter(Boolean);

  // If only 1 line, try splitting by " - " pattern (common in schedules)
  if (lines.length === 1) {
    // Check for pattern like "- 4:30 am - 55 mL ... - 7:45 am: 80 mL ..."
    // Split on " - " that's followed by a time
    const parts = text.split(/\s+-\s+(?=\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?)/i);
    if (parts.length > 1) lines = parts.map((l) => l.trim()).filter(Boolean);
  }

  // Also try splitting on semicolons
  if (lines.length === 1) {
    const parts = text.split(/;\s*/);
    if (parts.length > 1) lines = parts.map((l) => l.trim()).filter(Boolean);
  }

  return lines;
}

// ─── Main entry point: handles multi-entry messages ───

export async function parseAndSave(input: string): Promise<ParseResult> {
  const text = input.trim();
  if (!text) return { success: false, type: 'unknown', message: 'Please type something' };

  // Extract date from the message header (e.g. "26 Mar Milk schedule:")
  const date = parseDateFromText(text);

  // Always try parsing the full text as a single entry first
  // This handles cases like "Latched: 2:52 pm - 3:05 pm" which should NOT be split
  const singleResult = await parseSingleEntry(text, date);
  if (singleResult.success) return singleResult;

  // Split into individual entries
  const lines = splitEntries(text);

  // If splitting didn't produce multiple lines, return the failure
  if (lines.length <= 1) {
    return {
      success: false,
      type: 'unknown',
      message: `Couldn't parse that. Try:\n- "latched from 6:10 pm to 6:30 pm"\n- "80ml at 9am"\n- "potty at 3pm"\n- "weight 3.5 kg"\n- "vitamin d done"`,
    };
  }

  // Multi-entry: parse each line
  const results: string[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const line of lines) {
    // Skip lines that are just headers/dates
    if (/^(\d{1,2}\s*\w+\s*)?milk\s*(?:feed|schedule)?:?\s*$/i.test(line)) continue;
    if (line.length < 3) continue;

    const result = await parseSingleEntry(line, date);
    if (result.success) {
      if (result.message.includes('skipped')) {
        results.push(`~ ${result.message}`);
        skippedCount++;
      } else {
        results.push(`+ ${result.message}`);
        successCount++;
      }
    } else {
      // Try harder: if line has a time and amount, treat as expressed
      const amt = extractAmount(line);
      const time = extractSingleTime(line);
      if (amt && time) {
        if (await isDuplicateFeed(date, time, 'expressed', amt)) {
          results.push(`~ ${amt} mL at ${time} (skipped, duplicate)`);
          skippedCount++;
        } else {
          await addFeed({ id: generateId(), date, time, type: 'expressed', amountMl: amt });
          results.push(`+ ${amt} mL expressed at ${time}`);
          successCount++;
        }
      } else if (time && /latch/i.test(text)) {
        if (await isDuplicateFeed(date, time, 'latched')) {
          results.push(`~ Latched at ${time} (skipped, duplicate)`);
          skippedCount++;
        } else {
          await addFeed({ id: generateId(), date, time, type: 'latched', startTime: time });
          results.push(`+ Latched at ${time}`);
          successCount++;
        }
      } else if (amt) {
        const nowTime = currentTimeIST();
        await addFeed({ id: generateId(), date, time: nowTime, type: 'expressed', amountMl: amt });
        results.push(`+ ${amt} mL expressed`);
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  if (successCount === 0 && skippedCount === 0) {
    return {
      success: false,
      type: 'unknown',
      message: `Couldn't parse any entries. Try one entry per line:\n- "4:30 am - 55 mL expressed milk"\n- "4:50 am to 5:05 am - latched"\n- "potty at 3pm"`,
    };
  }

  const dateLabel = date === todayIST() ? 'today' : date;
  const parts: string[] = [];
  if (successCount > 0) parts.push(`${successCount} added`);
  if (skippedCount > 0) parts.push(`${skippedCount} duplicates skipped`);
  if (failCount > 0) parts.push(`${failCount} not parsed`);
  return {
    success: true,
    type: 'multi',
    message: `${parts.join(', ')} for ${dateLabel}:\n${results.join('\n')}`,
  };
}
