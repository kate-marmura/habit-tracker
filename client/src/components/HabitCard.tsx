import { Link } from 'react-router-dom';
import type { Habit } from '../types/habit';

interface Props {
  habit: Habit;
}

export default function HabitCard({ habit }: Props) {
  return (
    <li className="bg-surface rounded-xl border border-border p-4 flex items-start justify-between">
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
        <p className="text-xs text-muted mt-2">Started {habit.startDate}</p>
      </div>
    </li>
  );
}
