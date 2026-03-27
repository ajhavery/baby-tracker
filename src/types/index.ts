export type FeedType = 'expressed' | 'latched' | 'formula';

export interface FeedEntry {
  id: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  type: FeedType;
  amountMl?: number; // for expressed milk
  startTime?: string; // for latching
  endTime?: string; // for latching
  durationMinutes?: number; // for latching
  notes?: string;
}

export type DiaperType = 'urine' | 'potty' | 'both';

export interface DiaperEntry {
  id: string;
  date: string;
  time: string;
  type: DiaperType;
  notes?: string;
}

export interface GrowthEntry {
  id: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  notes?: string;
}

export interface BabyProfile {
  name: string;
  dateOfBirth: string;
  gender?: 'male' | 'female';
  bloodGroup?: string;
  photo?: string;
}

// Daily tasks (recurring)
export interface DailyTask {
  id: string;
  name: string; // e.g. "Vitamin D drops"
  description?: string;
  time?: string; // suggested time HH:mm
  active: boolean; // can be deactivated without deleting
  createdDate: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm when completed
  notes?: string;
}

// Vaccination tracker
export interface Vaccine {
  id: string;
  name: string;
  description?: string;
  scheduledWeek?: number; // weeks after birth
  scheduledMonth?: number; // months after birth
  doseNumber?: number;
  category?: string; // e.g. "Birth", "6 Weeks", "10 Weeks"
}

export interface VaccinationRecord {
  id: string;
  vaccineId: string;
  vaccineName: string;
  dateGiven: string;
  batchNumber?: string;
  administeredBy?: string;
  location?: string;
  notes?: string;
  nextDueDate?: string;
}

export interface DailySummary {
  date: string;
  totalExpressedMl: number;
  totalLatchSessions: number;
  totalLatchMinutes: number;
  totalFeeds: number;
  totalUrine: number;
  totalPotty: number;
  totalDiapers: number;
}
