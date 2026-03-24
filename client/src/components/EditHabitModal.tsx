import { useState, useEffect, type FormEvent } from 'react';
import { ApiError } from '../services/api';
import { updateHabit } from '../services/habitsApi';
import type { Habit, UpdateHabitPayload } from '../types/habit';
import { formatDate } from '../utils/formatDate';

interface Props {
  habit: Habit;
  onClose: () => void;
  onSaved: (habit: Habit) => void;
}

export default function EditHabitModal({ habit, onClose, onSaved }: Props) {
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function onDocumentKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => document.removeEventListener('keydown', onDocumentKeyDown);
  }, [onClose]);

  function validateFields(): boolean {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be at most 100 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateFields()) return;

    setIsSubmitting(true);
    const payload: UpdateHabitPayload = { name: name.trim() };
    if (description.trim()) {
      payload.description = description.trim();
    }

    try {
      const updated = await updateHabit(habit.id, payload);
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not update habit. Please check your connection and try again.');
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
        aria-labelledby="edit-habit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-habit-title" className="text-lg font-semibold text-text mb-6">
          Edit habit
        </h2>

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-habit-name" className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-habit-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                fieldErrors.name ? 'border-red-400' : 'border-border'
              }`}
              placeholder="e.g. Morning run"
              maxLength={100}
            />
            {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="edit-habit-description" className="block text-sm font-medium text-text mb-1">
              Description
            </label>
            <textarea
              id="edit-habit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition resize-none"
              placeholder="Optional notes about this habit"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div>
            <p className="text-sm text-text-secondary">
              <span className="font-medium">Start date:</span> {formatDate(habit.startDate)}
            </p>
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
              disabled={isSubmitting}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
