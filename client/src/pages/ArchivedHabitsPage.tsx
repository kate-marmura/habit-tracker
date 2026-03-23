import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { fetchArchivedHabits } from '../services/habitsApi';
import ArchivedHabitCard from '../components/ArchivedHabitCard';
import type { Habit } from '../types/habit';

export default function ArchivedHabitsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated, reloadNonce]);

  if (!isAuthenticated) return null;

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
        {loading ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">Loading archived habits...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="text-pink-500 hover:text-pink-600 font-medium text-sm"
            >
              Try again
            </button>
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No archived habits</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {habits.map((habit) => (
              <ArchivedHabitCard key={habit.id} habit={habit} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
