import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { fetchActiveHabits, archiveHabit } from '../services/habitsApi';
import CreateHabitModal from '../components/CreateHabitModal';
import EditHabitModal from '../components/EditHabitModal';
import DeleteHabitModal from '../components/DeleteHabitModal';
import ConfirmModal from '../components/ConfirmModal';
import HabitCard from '../components/HabitCard';
import type { Habit } from '../types/habit';

export default function HabitListPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [archivingHabit, setArchivingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

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
        const data = await fetchActiveHabits();
        if (!cancelled) setHabits(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === 'REQUEST_ABORTED') return;
          setError(err.message);
        } else {
          setError('Could not load habits. Please check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, reloadNonce]);

  function handleCreated(habit: Habit) {
    setHabits((prev) => [habit, ...prev]);
    setShowCreateModal(false);
  }

  function handleEditSaved(updated: Habit) {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    setEditingHabit(null);
  }

  async function handleArchiveConfirm() {
    if (!archivingHabit) return;
    await archiveHabit(archivingHabit.id);
    setHabits((prev) => prev.filter((h) => h.id !== archivingHabit.id));
    setArchivingHabit(null);
  }

  function handleDeleted() {
    if (!deletingHabit) return;
    setHabits((prev) => prev.filter((h) => h.id !== deletingHabit.id));
    setDeletingHabit(null);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Habit Tracker</h1>
          <div className="flex gap-3">
            <Link
              to="/habits/archived"
              className="px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
            >
              Archived
            </Link>
            <Link
              to="/settings"
              className="px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm font-medium"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text">Your Habits</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-lg transition text-sm"
          >
            + New habit
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">Loading habits...</p>
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
            <p className="text-text-secondary mb-4">Create your first habit</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-pink-500 hover:text-pink-600 font-medium text-sm"
            >
              + Create a habit
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={setEditingHabit}
                onArchive={setArchivingHabit}
                onDelete={setDeletingHabit}
              />
            ))}
          </ul>
        )}
      </main>

      {showCreateModal && (
        <CreateHabitModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSaved={handleEditSaved}
        />
      )}

      {archivingHabit && (
        <ConfirmModal
          title={`Archive \u2018${archivingHabit.name}\u2019?`}
          message="It will be moved to your archived habits and removed from your active list."
          confirmLabel="Archive"
          confirmVariant="danger"
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchivingHabit(null)}
        />
      )}

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
