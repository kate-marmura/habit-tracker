import { useState, useEffect, type FormEvent } from 'react';
import { ApiError } from '../services/api';
import { deleteHabit } from '../services/habitsApi';
import type { Habit } from '../types/habit';

interface Props {
  habit: Habit;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteHabitModal({ habit, onClose, onDeleted }: Props) {
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameMatches = confirmName.trim() === habit.name;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nameMatches) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await deleteHabit(habit.id);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not delete habit. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-lg border border-border p-8 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-habit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-habit-title" className="text-lg font-semibold text-pink-600 mb-2">
          Permanently delete '{habit.name}'?
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          This will remove the habit and all its tracking data. This cannot be undone.
        </p>

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="delete-confirm-name" className="block text-sm font-medium text-text mb-1">
              Type the habit name to confirm
            </label>
            <input
              id="delete-confirm-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
              placeholder={habit.name}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameMatches || isSubmitting}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
