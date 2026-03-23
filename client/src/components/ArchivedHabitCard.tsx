import { Link } from 'react-router-dom';
import type { Habit } from '../types/habit';

interface Props {
  habit: Habit;
}

export default function ArchivedHabitCard({ habit }: Props) {
  return (
    <li className="bg-surface rounded-xl border border-border/60 p-4 flex items-start justify-between opacity-80">
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
        {habit.description && (
          <p className="text-sm text-muted mt-1">{habit.description}</p>
        )}
        <p className="text-xs text-muted mt-2">Started {habit.startDate}</p>
      </div>
    </li>
  );
}
