import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { fetchHabitById, archiveHabit, unarchiveHabit } from '../services/habitsApi';
import HabitSettingsDropdown from '../components/HabitSettingsDropdown';
import EditHabitModal from '../components/EditHabitModal';
import type { Habit } from '../types/habit';

export default function HabitCalendarPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!id?.trim()) {
      setHabit(null);
      setError('This habit link is invalid.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHabitById(id!);
        if (!cancelled) setHabit(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === 'REQUEST_ABORTED') return;
          setError(err.message);
        } else {
          setError('Could not load habit. Please check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, id]);

  function handleSaved(updated: Habit) {
    setHabit(updated);
    setShowEditModal(false);
  }

  async function handleArchive() {
    if (!habit || !id) return;

    const confirmed = window.confirm(
      `Archive "${habit.name}"? It will be moved to your archived habits and removed from your active list.`,
    );
    if (!confirmed) return;

    try {
      await archiveHabit(id);
      navigate('/habits', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not archive habit. Please check your connection and try again.');
      }
    }
  }

  async function handleUnarchive() {
    if (!id) return;

    try {
      await unarchiveHabit(id);
      navigate('/habits', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not unarchive habit. Please check your connection and try again.');
      }
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-bold text-pink-500 truncate">
              {loading ? 'Loading...' : habit?.name ?? 'Habit'}
            </h1>
            {habit?.isArchived && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-muted shrink-0">
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {habit && !habit.isArchived && (
              <HabitSettingsDropdown
                onEdit={() => setShowEditModal(true)}
                onArchive={handleArchive}
              />
            )}
            {habit?.isArchived && (
              <HabitSettingsDropdown
                onUnarchive={handleUnarchive}
              />
            )}
            <Link
              to="/habits"
              className="px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
            >
              Back to habits
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">Loading habit...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              to="/habits"
              className="text-pink-500 hover:text-pink-600 font-medium text-sm"
            >
              Back to habits
            </Link>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-2">Calendar coming next</p>
            {habit?.description && (
              <p className="text-sm text-text-secondary mt-1">{habit.description}</p>
            )}
            <p className="text-xs text-muted mt-2">Started {habit?.startDate}</p>
          </div>
        )}
      </main>

      {showEditModal && habit && (
        <EditHabitModal
          habit={habit}
          onClose={() => setShowEditModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
