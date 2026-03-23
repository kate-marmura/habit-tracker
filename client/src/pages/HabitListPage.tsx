import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CreateHabitModal from '../components/CreateHabitModal';
import type { Habit } from '../types/habit';

export default function HabitListPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  function handleCreated(habit: Habit) {
    setHabits((prev) => [habit, ...prev]);
    setShowCreateModal(false);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Habbit Tracker</h1>
          <div className="flex gap-3">
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

        {habits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-4">No habits yet. Create your first one!</p>
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
              <li
                key={habit.id}
                className="bg-surface rounded-xl border border-border p-4 flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-text">{habit.name}</h3>
                  {habit.description && (
                    <p className="text-sm text-text-secondary mt-1">{habit.description}</p>
                  )}
                  <p className="text-xs text-muted mt-2">Started {habit.startDate}</p>
                </div>
              </li>
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
    </div>
  );
}
