const IST_LOCALE = 'en-IN';
const IST_TZ = 'Asia/Kolkata';

// Get current date/time in IST
export function nowIST(): Date {
  // Create a date string in IST and parse it back
  const istStr = new Date().toLocaleString('en-US', { timeZone: IST_TZ });
  return new Date(istStr);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

import { getDayStartHour } from './settings';

// Today's "tracking date" in IST — before day start hour counts as yesterday
export function todayIST(): string {
  const now = nowIST();
  if (now.getHours() < getDayStartHour()) {
    now.setDate(now.getDate() - 1);
  }
  return formatDate(now);
}

// Current tracking date for a given time
export function trackingDateForTime(time: string): string {
  const [h] = time.split(':').map(Number);
  const now = nowIST();
  if (h < getDayStartHour()) {
    now.setDate(now.getDate() - 1);
  }
  return formatDate(now);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function currentTimeIST(): string {
  const now = nowIST();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(IST_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getAgeDays(dob: string): number {
  const birth = new Date(dob + 'T00:00:00');
  const now = nowIST();
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAgeString(dob: string): string {
  const days = getAgeDays(dob);
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (months < 12) {
    return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months} months`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
}
