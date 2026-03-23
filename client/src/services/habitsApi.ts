import { get, put, patch, del } from './api';
import type { Habit, UpdateHabitPayload } from '../types/habit';

export function fetchActiveHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits');
}

export function fetchArchivedHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits/archived');
}

export function fetchHabitById(id: string): Promise<Habit> {
  return get<Habit>(`/api/habits/${id}`);
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
