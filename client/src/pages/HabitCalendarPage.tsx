import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import {
  fetchHabitById,
  archiveHabit,
  unarchiveHabit,
  fetchEntries,
  createEntry,
  deleteEntry,
} from '../services/habitsApi';
import HabitSettingsDropdown from '../components/HabitSettingsDropdown';
import EditHabitModal from '../components/EditHabitModal';
import DeleteHabitModal from '../components/DeleteHabitModal';
import ConfirmModal from '../components/ConfirmModal';
import CalendarGrid from '../components/CalendarGrid';
import ErrorToast from '../components/ErrorToast';
import UndoToast from '../components/UndoToast';
import type { Habit } from '../types/habit';

interface UndoState {
  dateStr: string;
  timerId: ReturnType<typeof setTimeout>;
  previousEntries: Set<string> | undefined;
}

export default function HabitCalendarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const undoStateRef = useRef<UndoState | null>(null);

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth() + 1);
  const monthStr = `${calYear}-${String(calMonth).padStart(2, '0')}`;
  const entriesQueryKey = useMemo(() => ['entries', id, monthStr], [id, monthStr]);

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

  useEffect(() => {
    return () => {
      if (undoStateRef.current) {
        clearTimeout(undoStateRef.current.timerId);
      }
    };
  }, []);

  const entriesQuery = useQuery({
    queryKey: entriesQueryKey,
    queryFn: async () => {
      const data = await fetchEntries(id!, monthStr);
      return new Set(data.map((e) => e.entryDate));
    },
    enabled: !!habit && !!id,
  });

  const markMutation = useMutation({
    mutationFn: (dateStr: string) => createEntry(id!, dateStr),
    onMutate: async (dateStr) => {
      await queryClient.cancelQueries({ queryKey: entriesQueryKey });
      queryClient.setQueryData<Set<string>>(entriesQueryKey, (old) => new Set([...(old ?? []), dateStr]));
      setPendingDates((prev) => new Set([...prev, dateStr]));
    },
    onError: (_err, dateStr) => {
      queryClient.setQueryData<Set<string>>(entriesQueryKey, (old) => {
        const next = new Set(old ?? []);
        next.delete(dateStr);
        return next;
      });
      setPendingDates((prev) => {
        const next = new Set(prev);
        next.delete(dateStr);
        return next;
      });
      const msg = _err instanceof Error ? _err.message : 'Could not mark day. Please try again.';
      setToastMessage(msg);
    },
    onSuccess: (_data, dateStr) => {
      setPendingDates((prev) => {
        const next = new Set(prev);
        next.delete(dateStr);
        return next;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
  });

  const fireDelete = useCallback(
    async (dateStr: string) => {
      setUndoToastMessage(null);
      undoStateRef.current = null;
      try {
        await deleteEntry(id!, dateStr);
        queryClient.invalidateQueries({ queryKey: entriesQueryKey });
      } catch (err) {
        queryClient.setQueryData<Set<string>>(entriesQueryKey, (old) => new Set([...(old ?? []), dateStr]));
        const msg = err instanceof Error ? err.message : 'Could not unmark day. Please try again.';
        setToastMessage(msg);
      } finally {
        setPendingDates((prev) => {
          const next = new Set(prev);
          next.delete(dateStr);
          return next;
        });
      }
    },
    [id, queryClient, entriesQueryKey],
  );

  const handleUnmark = useCallback(
    (dateStr: string) => {
      setToastMessage(null);
      if (undoStateRef.current) {
        const prev = undoStateRef.current;
        clearTimeout(prev.timerId);
        fireDelete(prev.dateStr);
      }

      const snapshot = queryClient.getQueryData<Set<string>>(entriesQueryKey);
      queryClient.setQueryData<Set<string>>(entriesQueryKey, (old) => {
        const next = new Set(old);
        next.delete(dateStr);
        return next;
      });
      setPendingDates((prev) => new Set([...prev, dateStr]));
      setUndoToastMessage('Day unmarked');

      const timerId = setTimeout(() => {
        fireDelete(dateStr);
      }, 3000);

      undoStateRef.current = { dateStr, timerId, previousEntries: snapshot };
    },
    [queryClient, entriesQueryKey, fireDelete],
  );

  const handleUndo = useCallback(() => {
    if (!undoStateRef.current) return;
    const { timerId, previousEntries, dateStr } = undoStateRef.current;
    clearTimeout(timerId);
    if (previousEntries) {
      queryClient.setQueryData(entriesQueryKey, previousEntries);
    }
    setPendingDates((prev) => {
      const next = new Set(prev);
      next.delete(dateStr);
      return next;
    });
    setUndoToastMessage(null);
    undoStateRef.current = null;
  }, [queryClient, entriesQueryKey]);

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (pendingDates.has(dateStr)) return;
      const markedSet = entriesQuery.data;
      if (markedSet?.has(dateStr)) {
        handleUnmark(dateStr);
      } else {
        markMutation.mutate(dateStr);
      }
    },
    [pendingDates, entriesQuery.data, handleUnmark, markMutation],
  );

  const dismissToast = useCallback(() => setToastMessage(null), []);

  function handleSaved(updated: Habit) {
    setHabit(updated);
    setShowEditModal(false);
  }

  async function handleArchiveConfirm() {
    if (!id) return;
    await archiveHabit(id);
    navigate('/habits', { replace: true });
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

  const markedDates = entriesQuery.data ?? new Set<string>();

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
                onArchive={() => setShowArchiveModal(true)}
                onDelete={() => setShowDeleteModal(true)}
              />
            )}
            {habit?.isArchived && (
              <HabitSettingsDropdown
                onUnarchive={handleUnarchive}
                onDelete={() => setShowDeleteModal(true)}
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
          <div>
            {entriesQuery.isLoading && (
              <p className="text-text-secondary text-sm mb-2">Loading entries...</p>
            )}
            {entriesQuery.isError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-3" role="alert">
                {entriesQuery.error instanceof Error ? entriesQuery.error.message : 'Could not load entries.'}
              </div>
            )}
            {habit && (
              <CalendarGrid
                year={calYear}
                month={calMonth}
                habitStartDate={habit.startDate}
                markedDates={markedDates}
                pendingDates={pendingDates}
                onDayClick={!habit.isArchived ? handleDayClick : undefined}
              />
            )}
            {habit?.description && (
              <p className="text-sm text-text-secondary mt-4">{habit.description}</p>
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

      {showDeleteModal && habit && (
        <DeleteHabitModal
          habit={habit}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => navigate('/habits', { replace: true })}
        />
      )}

      {showArchiveModal && habit && (
        <ConfirmModal
          title={`Archive \u2018${habit.name}\u2019?`}
          message="It will be moved to your archived habits and removed from your active list."
          confirmLabel="Archive"
          confirmVariant="danger"
          onConfirm={handleArchiveConfirm}
          onCancel={() => setShowArchiveModal(false)}
        />
      )}

      <UndoToast message={undoToastMessage} onUndo={handleUndo} />
      <ErrorToast message={toastMessage} onDismiss={dismissToast} />
    </div>
  );
}
