import type { HabitStats } from '../types/habit';

interface Props {
  stats: HabitStats | undefined;
  isLoading: boolean;
}

function streakDisplay(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

function completionPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function StatsPanel({ stats, isLoading }: Props) {
  const showPlaceholder = isLoading || stats === undefined;

  return (
    <section
      className="bg-surface rounded-lg border border-border p-4"
      aria-label="Habit statistics"
    >
      <div className="flex flex-col sm:flex-row md:flex-col gap-4 justify-stretch">
        <div className="flex-1 sm:min-w-[140px] md:min-w-0 text-center bg-background rounded-lg p-3">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Current Streak</p>
          <p
            className={`text-2xl font-bold text-pink-500 ${showPlaceholder ? 'animate-pulse text-muted' : ''}`}
          >
            {showPlaceholder ? '—' : streakDisplay(stats.currentStreak)}
          </p>
        </div>
        <div className="flex-1 sm:min-w-[140px] md:min-w-0 text-center bg-background rounded-lg p-3">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Longest Streak</p>
          <p
            className={`text-2xl font-bold text-pink-500 ${showPlaceholder ? 'animate-pulse text-muted' : ''}`}
          >
            {showPlaceholder ? '—' : streakDisplay(stats.longestStreak)}
          </p>
        </div>
        <div className="flex-1 sm:min-w-[140px] md:min-w-0 text-center bg-background rounded-lg p-3">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Completion Rate</p>
          <p
            className={`text-2xl font-bold text-pink-500 ${showPlaceholder ? 'animate-pulse text-muted' : ''}`}
          >
            {showPlaceholder ? '—' : completionPercent(stats.completionRate)}
          </p>
        </div>
      </div>
    </section>
  );
}
