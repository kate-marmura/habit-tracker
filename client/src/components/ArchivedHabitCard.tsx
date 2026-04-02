import { Link } from 'react-router-dom';
import { Eye, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Habit } from '../types/habit';
import { formatDate } from '../utils/formatDate';

interface Props {
  habit: Habit;
  onUnarchive?: (habit: Habit) => void;
  onDelete?: (habit: Habit) => void;
}

export default function ArchivedHabitCard({ habit, onUnarchive, onDelete }: Props) {
  return (
    <li className="bg-surface rounded-xl border border-border/60 p-4 flex items-start justify-between gap-3 opacity-80">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/habits/${habit.id}`}
            className="font-medium text-text-secondary hover:text-pink-500 transition"
            aria-label={`View archived habit ${habit.name}`}
          >
            {habit.name}
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-muted">
            Archived
          </span>
        </div>
        {habit.description && <p className="text-sm text-muted mt-1">{habit.description}</p>}
        <p className="text-xs text-muted mt-2">Started {formatDate(habit.startDate)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        <Link
          to={`/habits/${habit.id}`}
          className="p-1.5 rounded text-text-secondary hover:text-pink-500 transition"
          aria-label={`View ${habit.name}`}
        >
          <Eye size={18} />
        </Link>
        {onUnarchive && (
          <button
            type="button"
            onClick={() => onUnarchive(habit)}
            className="p-1.5 rounded text-text-secondary hover:text-pink-500 transition"
            aria-label={`Unarchive ${habit.name}`}
          >
            <ArchiveRestore size={18} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(habit)}
            className="p-1.5 rounded text-text-secondary hover:text-red-500 transition"
            aria-label={`Delete ${habit.name}`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
