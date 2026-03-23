import { getDate } from 'date-fns';

interface Props {
  date: Date;
  isToday: boolean;
  isBeforeStart: boolean;
  isFuture: boolean;
  onClick?: () => void;
}

export default function DayCell({ date, isToday, isBeforeStart, isFuture, onClick }: Props) {
  const day = getDate(date);
  const inactive = isBeforeStart || isFuture;

  let cellClasses =
    'min-h-[44px] min-w-[44px] aspect-square flex items-center justify-center rounded-lg text-sm font-medium select-none';

  if (inactive) {
    cellClasses += ' bg-surface text-muted cursor-default';
  } else if (isToday) {
    cellClasses += ' bg-pink-50 ring-2 ring-pink-500 text-pink-700';
  } else {
    cellClasses += ` bg-background border border-border text-text hover:bg-pink-50 transition${onClick ? ' cursor-pointer' : ''}`;
  }

  return (
    <div
      className={cellClasses}
      role="gridcell"
      aria-label={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${isToday ? ' (today)' : ''}`}
      onClick={inactive ? undefined : onClick}
      aria-disabled={inactive || undefined}
    >
      {day}
    </div>
  );
}
