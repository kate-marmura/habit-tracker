import { render, screen } from '@testing-library/react';
import StatsPanel from './StatsPanel';
import type { HabitStats } from '../types/habit';

const baseStats: HabitStats = {
  currentStreak: 5,
  longestStreak: 12,
  completionRate: 0.954,
  totalDays: 100,
  completedDays: 95,
};

describe('StatsPanel', () => {
  it('renders current streak with plural days label', () => {
    render(<StatsPanel stats={baseStats} isLoading={false} />);
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('renders longest streak with correct day label', () => {
    render(<StatsPanel stats={baseStats} isLoading={false} />);
    expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument();
  });

  it('renders completion rate as rounded percentage', () => {
    render(<StatsPanel stats={baseStats} isLoading={false} />);
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('shows loading placeholders when isLoading is true', () => {
    render(<StatsPanel stats={undefined} isLoading />);
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(3);
  });

  it('shows loading placeholders when stats is undefined', () => {
    render(<StatsPanel stats={undefined} isLoading={false} />);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('renders 0% for completionRate of 0', () => {
    render(
      <StatsPanel
        stats={{ ...baseStats, completionRate: 0, currentStreak: 0, longestStreak: 0 }}
        isLoading={false}
      />,
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 100% for completionRate of 1', () => {
    render(
      <StatsPanel
        stats={{ ...baseStats, completionRate: 1, currentStreak: 1, longestStreak: 1 }}
        isLoading={false}
      />,
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('uses singular "1 day" for streak value of 1', () => {
    render(
      <StatsPanel stats={{ ...baseStats, currentStreak: 1, longestStreak: 1 }} isLoading={false} />,
    );
    const oneDayLabels = screen.getAllByText('1 day');
    expect(oneDayLabels).toHaveLength(2);
  });
});
