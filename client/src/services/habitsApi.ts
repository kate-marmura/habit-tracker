import { get } from './api';
import type { Habit } from '../types/habit';

export function fetchActiveHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits');
}

export function fetchArchivedHabits(): Promise<Habit[]> {
  return get<Habit[]>('/api/habits/archived');
}
