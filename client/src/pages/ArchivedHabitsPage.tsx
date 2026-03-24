import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../services/api';
import { fetchArchivedHabits, unarchiveHabit } from '../services/habitsApi';
import ArchivedHabitCard from '../components/ArchivedHabitCard';
import DeleteHabitModal from '../components/DeleteHabitModal';
import type { Habit } from '../types/habit';

export default function ArchivedHabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  useEffect(() => {

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchArchivedHabits();
        if (!cancelled) setHabits(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === 'REQUEST_ABORTED') return;
          setError(err.message);
        } else {
          setError('Could not load archived habits. Please check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloadNonce]);

  async function handleUnarchive(habit: Habit) {
    try {
      await unarchiveHabit(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not unarchive habit. Please check your connection and try again.');
      }
    }
  }

  function handleDeleted() {
    if (!deletingHabit) return;
    setHabits((prev) => prev.filter((h) => h.id !== deletingHabit.id));
    setDeletingHabit(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Archived Habits</h1>
          <Link
            to="/habits"
            className="px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
          >
            Back to habits
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
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

        {!loading && error && !habits.length && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
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
