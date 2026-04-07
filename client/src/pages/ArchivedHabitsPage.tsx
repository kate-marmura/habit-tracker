import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '../services/api';
import { fetchArchivedHabits, unarchiveHabit } from '../services/habitsApi';
import ArchivedHabitCard from '../components/ArchivedHabitCard';
import DeleteHabitModal from '../components/DeleteHabitModal';
import type { Habit } from '../types/habit';

export default function ArchivedHabitsPage() {
  const queryClient = useQueryClient();
  const habitsQuery = useQuery({
    queryKey: ['archivedHabits'],
    queryFn: fetchArchivedHabits,
  });
  const habits = habitsQuery.data ?? [];
  const loading = habitsQuery.isLoading;
  const queryError = habitsQuery.error
    ? habitsQuery.error instanceof ApiError
      ? habitsQuery.error.message
      : 'Could not load archived habits. Please check your connection and try again.'
    : null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  const error = actionError ?? queryError;

  async function handleUnarchive(habit: Habit) {
    setActionError(null);
    try {
      const activeHabit = await unarchiveHabit(habit.id);
      queryClient.setQueryData<Habit[]>(['archivedHabits'], (old) =>
        old?.filter((h) => h.id !== habit.id),
      );
      queryClient.setQueryData<Habit[]>(['habits'], (old) =>
        old ? [activeHabit, ...old.filter((h) => h.id !== activeHabit.id)] : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['archivedHabits'] });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setActionError(err.message);
      } else {
        setActionError('Could not unarchive habit. Please check your connection and try again.');
      }
    }
  }

  function handleDeleted() {
    if (!deletingHabit) return;
    queryClient.setQueryData<Habit[]>(['archivedHabits'], (old) =>
      old?.filter((h) => h.id !== deletingHabit.id),
    );
    void queryClient.invalidateQueries({ queryKey: ['archivedHabits'] });
    setDeletingHabit(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Archived Habits</h1>
          <Link
            to="/habits"
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
            aria-label="Back to habits"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to habits</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl md:max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">Loading archived habits...</p>
          </div>
        ) : habits.length === 0 && !error ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No archived habits</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {habits.map((habit) => (
              <ArchivedHabitCard
                key={habit.id}
                habit={habit}
                onUnarchive={handleUnarchive}
                onDelete={setDeletingHabit}
              />
            ))}
          </ul>
        )}

        {!loading && queryError && !habits.length && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['archivedHabits'] })}
              className="text-pink-500 hover:text-pink-600 font-medium text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </main>

      {deletingHabit && (
        <DeleteHabitModal
          habit={deletingHabit}
          onClose={() => setDeletingHabit(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
