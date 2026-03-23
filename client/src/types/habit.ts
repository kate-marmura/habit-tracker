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
