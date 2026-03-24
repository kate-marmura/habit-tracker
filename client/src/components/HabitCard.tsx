import { Link } from 'react-router-dom';
import { Eye, Pencil, Archive, Trash2 } from 'lucide-react';
import type { Habit } from '../types/habit';
import { formatDate } from '../utils/formatDate';

interface Props {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export default function HabitCard({ habit, onEdit, onArchive, onDelete }: Props) {
  return (
    <li className="bg-surface rounded-xl border border-border p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/habits/${habit.id}`}
          className="font-medium text-text hover:text-pink-500 transition"
          aria-label={`View calendar for ${habit.name}`}
        >
          {habit.name}
        </Link>
        {habit.description && (
          <p className="text-sm text-text-secondary mt-1">{habit.description}</p>
        )}
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
        <button
          type="button"
          onClick={() => onEdit(habit)}
          className="p-1.5 rounded text-text-secondary hover:text-pink-500 transition"
          aria-label={`Edit ${habit.name}`}
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          onClick={() => onArchive(habit)}
          className="p-1.5 rounded text-text-secondary hover:text-pink-500 transition"
          aria-label={`Archive ${habit.name}`}
        >
          <Archive size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(habit)}
          className="p-1.5 rounded text-text-secondary hover:text-red-500 transition"
          aria-label={`Delete ${habit.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}
