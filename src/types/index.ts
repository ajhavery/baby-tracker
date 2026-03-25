export type FeedType = 'expressed' | 'latched';

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
