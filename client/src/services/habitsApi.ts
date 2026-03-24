import { get, post, put, patch, del } from './api';
import type { Habit, UpdateHabitPayload, DayEntry, HabitStats } from '../types/habit';

export function fetchActiveHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits');
}

export function fetchArchivedHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits/archived');
}

export function fetchHabitById(id: string): Promise<Habit> {
  return get<Habit>(`/api/habits/${id}`);
}

export function fetchHabitStats(habitId: string): Promise<HabitStats> {
  return get<HabitStats>(`/api/habits/${habitId}/stats`);
}

export function updateHabit(id: string, payload: UpdateHabitPayload): Promise<Habit> {
  return put<Habit>(`/api/habits/${id}`, payload);
}

export function archiveHabit(id: string): Promise<Habit> {
  return patch<Habit>(`/api/habits/${id}/archive`);
}

export function unarchiveHabit(id: string): Promise<Habit> {
  return patch<Habit>(`/api/habits/${id}/unarchive`);
}

export function deleteHabit(id: string): Promise<{ deleted: boolean }> {
  return del<{ deleted: boolean }>(`/api/habits/${id}`);
}

export function fetchEntries(habitId: string, month: string): Promise<DayEntry[]> {
  return get<DayEntry[]>(`/api/habits/${habitId}/entries?month=${month}`);
}

export function createEntry(habitId: string, date: string): Promise<DayEntry> {
  return post<DayEntry>(`/api/habits/${habitId}/entries`, { date });
}

export function deleteEntry(habitId: string, date: string): Promise<void> {
  return del<void>(`/api/habits/${habitId}/entries/${date}`);
}
