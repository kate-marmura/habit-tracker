import { getDate } from 'date-fns';
import { Check } from 'lucide-react';

interface Props {
  date: Date;
  isToday: boolean;
  isBeforeStart: boolean;
  isFuture: boolean;
  isMarked?: boolean;
  isMutating?: boolean;
  onClick?: () => void;
}

export default function DayCell({
  date,
  isToday,
  isBeforeStart,
  isFuture,
  isMarked,
  isMutating,
  onClick,
}: Props) {
  const day = getDate(date);
  const inactive = isBeforeStart || isFuture;

  let cellClasses =
    'min-h-[44px] min-w-[44px] aspect-square flex items-center justify-center rounded-lg text-sm font-medium select-none transition-all duration-150';

  if (inactive) {
    cellClasses += ' bg-surface text-muted cursor-default';
  } else if (isMarked && isToday) {
    cellClasses += ' bg-pink-marked text-pink-700 ring-2 ring-pink-400 font-bold';
    if (onClick) cellClasses += ' hover:bg-pink-300';
  } else if (isMarked) {
    cellClasses += ' bg-pink-marked text-pink-700 font-bold';
    if (onClick) cellClasses += ' hover:bg-pink-300';
  } else if (isToday) {
    cellClasses += ' bg-pink-50 ring-2 ring-pink-500 text-pink-700';
    if (onClick) cellClasses += ' hover:bg-pink-100';
  } else {
    cellClasses += ' bg-background border border-border text-text hover:bg-pink-50';
  }

  if (!inactive && !isMutating && onClick) {
    cellClasses += ' cursor-pointer active:scale-[0.97]';
  }

  if (isMutating) {
    cellClasses += ' opacity-60 pointer-events-none';
  }

  const label = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${isToday ? ' (today)' : ''}${isMarked && !inactive ? ' (marked)' : ''}`;

  return (
    <div
      className={cellClasses}
      role="gridcell"
      aria-label={label}
      onClick={inactive || isMutating ? undefined : onClick}
      aria-disabled={inactive || isMutating || undefined}
    >
      <span className="flex items-center gap-0.5">
        {day}
        {isMarked && !inactive && (
          <Check size={14} strokeWidth={3} className="text-pink-700 shrink-0" aria-hidden="true" />
        )}
      </span>
    </div>
  );
}
