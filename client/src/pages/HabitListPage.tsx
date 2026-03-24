import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api';
import { fetchActiveHabits, archiveHabit } from '../services/habitsApi';
import CreateHabitModal from '../components/CreateHabitModal';
import EditHabitModal from '../components/EditHabitModal';
import DeleteHabitModal from '../components/DeleteHabitModal';
import ConfirmModal from '../components/ConfirmModal';
import HabitCard from '../components/HabitCard';
import type { Habit } from '../types/habit';

export default function HabitListPage() {
  const queryClient = useQueryClient();
  const habitsQuery = useQuery({
    queryKey: ['habits'],
    queryFn: fetchActiveHabits,
  });
  const habits = habitsQuery.data ?? [];
  const loading = habitsQuery.isLoading;
  const error = habitsQuery.error
    ? habitsQuery.error instanceof ApiError
      ? habitsQuery.error.message
      : 'Could not load habits. Please check your connection and try again.'
    : null;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [archivingHabit, setArchivingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  function handleCreated(habit: Habit) {
    queryClient.setQueryData<Habit[]>(['habits'], (old) => [habit, ...(old ?? [])]);
    setShowCreateModal(false);
  }

  function handleEditSaved(updated: Habit) {
    queryClient.setQueryData<Habit[]>(['habits'], (old) =>
      old?.map((h) => (h.id === updated.id ? updated : h)),
    );
    setEditingHabit(null);
  }

  async function handleArchiveConfirm() {
    if (!archivingHabit) return;
    const archivedHabit = await archiveHabit(archivingHabit.id);
    queryClient.setQueryData<Habit[]>(['habits'], (old) =>
      old?.filter((h) => h.id !== archivingHabit.id),
    );
    queryClient.setQueryData<Habit[]>(['archivedHabits'], (old) =>
      old ? [archivedHabit, ...old.filter((h) => h.id !== archivedHabit.id)] : old,
    );
    void queryClient.invalidateQueries({ queryKey: ['habits'] });
    void queryClient.invalidateQueries({ queryKey: ['archivedHabits'] });
    setArchivingHabit(null);
  }

  function handleDeleted() {
    if (!deletingHabit) return;
    queryClient.setQueryData<Habit[]>(['habits'], (old) =>
      old?.filter((h) => h.id !== deletingHabit.id),
    );
    setDeletingHabit(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl md:max-w-4xl mx-auto px-4 py-8">
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['habits'] })}
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
