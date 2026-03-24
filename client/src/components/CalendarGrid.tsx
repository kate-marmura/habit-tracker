import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday as isTodayFn,
  isBefore,
  isAfter,
  startOfDay,
  format,
} from 'date-fns';
import DayCell from './DayCell';

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  year: number;
  month: number;
  habitStartDate: string;
  markedDates?: Set<string>;
  pendingDates?: Set<string>;
  onDayClick?: (dateStr: string) => void;
}

export default function CalendarGrid({ year, month, habitStartDate, markedDates, pendingDates, onDayClick }: Props) {
  const { days, leadingBlanks, startDate } = useMemo(() => {
    const monthDate = new Date(year, month - 1, 1);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const daysList = eachDayOfInterval({ start, end });
    const blanks = getDay(start);
    const [sy, sm, sd] = habitStartDate.split('-').map(Number);
    const parsedStart = new Date(sy, sm - 1, sd);
    return { days: daysList, leadingBlanks: blanks, startDate: parsedStart };
  }, [year, month, habitStartDate]);

  const today = startOfDay(new Date());

  return (
    <div role="grid" aria-label={`Calendar for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}>
      <div className="grid grid-cols-7 gap-1 mb-1" role="row">
        {WEEKDAY_HEADERS.map((label, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold text-muted py-1"
            role="columnheader"
            aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="row">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} className="min-h-[44px] min-w-[44px] aspect-square" />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isMarked = markedDates?.has(dateStr);
          const dayIsInactive = isBefore(day, startDate) || isAfter(day, today);
          return (
            <DayCell
              key={day.toISOString()}
              date={day}
              isToday={isTodayFn(day)}
              isBeforeStart={isBefore(day, startDate)}
              isFuture={isAfter(day, today)}
              isMarked={isMarked}
              isMutating={pendingDates?.has(dateStr)}
              onClick={!dayIsInactive && !isMarked && onDayClick ? () => onDayClick(dateStr) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
