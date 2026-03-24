import { useState, useMemo, useCallback, type KeyboardEvent } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isToday as isTodayFn,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Props {
  id?: string;
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

export default function DatePicker({
  id,
  value,
  onChange,
  maxDate: maxDateProp,
  'aria-invalid': ariaInvalid,
  className = '',
}: Props) {
  const maxDateStr = maxDateProp ?? todayYmd();
  const maxD = useMemo(
    () => startOfDay(parse(maxDateStr, 'yyyy-MM-dd', new Date())),
    [maxDateStr],
  );

  const safeValueDate = useMemo(() => {
    const p = parse(value, 'yyyy-MM-dd', new Date());
    if (Number.isNaN(p.getTime())) return maxD;
    const sd = startOfDay(p);
    return isAfter(sd, maxD) ? maxD : sd;
  }, [value, maxD]);

  const [viewYear, setViewYear] = useState(() => safeValueDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => safeValueDate.getMonth() + 1);
  const [focusDate, setFocusDate] = useState<Date>(() => safeValueDate);

  const maxYear = maxD.getFullYear();
  const maxMon = maxD.getMonth() + 1;
  const canGoNext =
    viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMon);

  const monthStart = useMemo(
    () => startOfMonth(new Date(viewYear, viewMonth - 1, 1)),
    [viewYear, viewMonth],
  );
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  const { days, leadingBlanks } = useMemo(() => {
    const daysList = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return { days: daysList, leadingBlanks: getDay(monthStart) };
  }, [monthStart, monthEnd]);

  const goPrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goNextMonth = useCallback(() => {
    if (!canGoNext) return;
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth, canGoNext]);

  const handleGridKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isAfter(startOfDay(focusDate), maxD)) {
          onChange(format(focusDate, 'yyyy-MM-dd'));
        }
        return;
      }

      e.preventDefault();
      let next = focusDate;
      if (e.key === 'ArrowLeft') next = subDays(focusDate, 1);
      else if (e.key === 'ArrowRight') next = addDays(focusDate, 1);
      else if (e.key === 'ArrowUp') next = subDays(focusDate, 7);
      else if (e.key === 'ArrowDown') next = addDays(focusDate, 7);

      if (isBefore(next, monthStart) || isAfter(next, monthEnd)) return;
      if (isAfter(startOfDay(next), maxD)) {
        setFocusDate(maxD);
        return;
      }
      setFocusDate(next);
    },
    [focusDate, maxD, monthStart, monthEnd, onChange],
  );

  const label = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div
      id={id}
      className={`rounded-lg border border-border bg-background p-3 ${className}`.trim()}
      aria-invalid={ariaInvalid === true ? true : undefined}
    >
      <div className="flex items-center justify-center gap-3 mb-2">
        <button
          type="button"
          onClick={goPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-text-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-text min-w-[140px] text-center">{label}</span>
        <button
          type="button"
          onClick={goNextMonth}
          disabled={!canGoNext}
          className="p-2 rounded-lg transition text-text-secondary hover:bg-gray-100 disabled:text-muted disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        role="grid"
        aria-label="Choose start date"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-md"
      >
        <div className="grid grid-cols-7 gap-1 mb-1" role="row">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted py-1" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="row">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`b-${i}`} className="min-h-[44px] min-w-[44px]" />
          ))}
          {days.map((day) => {
            const ymd = format(day, 'yyyy-MM-dd');
            const disabled = isAfter(startOfDay(day), maxD);
            const selected = value === ymd;
            const today = isTodayFn(day);
            const focused = isSameDay(day, focusDate);

            let cell =
              'min-h-[44px] min-w-[44px] aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ';
            if (disabled) {
              cell += 'bg-surface text-muted cursor-default';
            } else if (selected) {
              cell += 'bg-pink-500 text-white font-semibold ring-2 ring-pink-600';
            } else if (today) {
              cell += 'bg-pink-50 ring-2 ring-pink-500 text-pink-700 hover:bg-pink-100';
            } else {
              cell += 'bg-background border border-border text-text hover:bg-pink-50';
            }

            if (!disabled) {
              cell += ' cursor-pointer active:scale-[0.97]';
            }
            if (focused && !selected) {
              cell += ' ring-2 ring-offset-1 ring-pink-400';
            }

            return (
              <button
                key={ymd}
                type="button"
                role="gridcell"
                tabIndex={-1}
                disabled={disabled}
                aria-selected={selected}
                aria-current={today ? 'date' : undefined}
                className={cell}
                onMouseDown={(ev) => {
                  if (!disabled) ev.preventDefault();
                }}
                onClick={() => {
                  if (!disabled) {
                    setFocusDate(day);
                    onChange(ymd);
                  }
                }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
