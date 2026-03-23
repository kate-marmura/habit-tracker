import { getDate } from 'date-fns';
import { Check } from 'lucide-react';

interface Props {
  date: Date;
  isToday: boolean;
  isBeforeStart: boolean;
  isFuture: boolean;
  isMarked?: boolean;
  onClick?: () => void;
}

export default function DayCell({ date, isToday, isBeforeStart, isFuture, isMarked, onClick }: Props) {
  const day = getDate(date);
  const inactive = isBeforeStart || isFuture;

  let cellClasses =
    'min-h-[44px] min-w-[44px] aspect-square flex items-center justify-center rounded-lg text-sm font-medium select-none';

  if (inactive) {
    cellClasses += ' bg-surface text-muted cursor-default';
  } else if (isMarked && isToday) {
    cellClasses += ' bg-pink-500 text-white ring-2 ring-pink-700 font-bold';
  } else if (isMarked) {
    cellClasses += ' bg-pink-500 text-white font-bold';
  } else if (isToday) {
    cellClasses += ' bg-pink-50 ring-2 ring-pink-500 text-pink-700';
  } else {
    cellClasses += ` bg-background border border-border text-text hover:bg-pink-50 transition${onClick ? ' cursor-pointer' : ''}`;
  }

  const label = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${isToday ? ' (today)' : ''}${isMarked && !inactive ? ' (marked)' : ''}`;

  return (
    <div
      className={cellClasses}
      role="gridcell"
      aria-label={label}
      onClick={inactive ? undefined : onClick}
      aria-disabled={inactive || undefined}
    >
      <span className="flex items-center gap-0.5">
        {day}
        {isMarked && !inactive && <Check size={14} strokeWidth={3} aria-hidden="true" />}
      </span>
    </div>
  );
}
