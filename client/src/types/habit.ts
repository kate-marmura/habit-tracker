export interface Habit {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHabitPayload {
  name: string;
  description?: string;
  startDate: string;
}

export interface UpdateHabitPayload {
  name: string;
  description?: string;
}

export interface DayEntry {
  id: string;
  entryDate: string;
}
