import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayCell from './DayCell';

describe('DayCell', () => {
  it('renders the day number', () => {
    render(<DayCell date={new Date(2026, 2, 15)} isToday={false} isBeforeStart={false} isFuture={false} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('applies today styling', () => {
    render(<DayCell date={new Date(2026, 2, 15)} isToday={true} isBeforeStart={false} isFuture={false} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-pink-50');
    expect(cell.className).toContain('ring-pink-500');
  });

  it('includes (today) in aria-label when isToday', () => {
    render(<DayCell date={new Date(2026, 2, 15)} isToday={true} isBeforeStart={false} isFuture={false} />);
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', expect.stringContaining('(today)'));
  });

  it('applies before-start styling', () => {
    render(<DayCell date={new Date(2026, 2, 1)} isToday={false} isBeforeStart={true} isFuture={false} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-surface');
    expect(cell.className).toContain('text-muted');
    expect(cell.className).toContain('cursor-default');
  });

  it('applies future styling', () => {
    render(<DayCell date={new Date(2026, 2, 30)} isToday={false} isBeforeStart={false} isFuture={true} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-surface');
    expect(cell.className).toContain('text-muted');
  });

  it('applies eligible default styling', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-background');
    expect(cell.className).toContain('border-border');
    expect(cell.className).toContain('hover:bg-pink-50');
  });

  it('does not fire onClick for inactive cells', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<DayCell date={new Date(2026, 2, 1)} isToday={false} isBeforeStart={true} isFuture={false} onClick={onClick} />);
    await user.click(screen.getByRole('gridcell'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick for eligible cells', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} onClick={onClick} />);
    await user.click(screen.getByRole('gridcell'));
    expect(onClick).toHaveBeenCalled();
  });

  it('meets minimum touch target size', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('min-h-[44px]');
    expect(cell.className).toContain('min-w-[44px]');
  });

  it('applies marked styling', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-pink-500');
    expect(cell.className).toContain('text-white');
    expect(cell.className).toContain('font-bold');
  });

  it('shows checkmark icon when marked', () => {
    const { container } = render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('includes (marked) in aria-label when marked', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} />);
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', expect.stringContaining('(marked)'));
  });

  it('applies combined marked+today styling', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={true} isBeforeStart={false} isFuture={false} isMarked={true} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-pink-500');
    expect(cell.className).toContain('ring-pink-700');
    expect(cell.className).toContain('text-white');
  });

  it('does not show marked state for inactive (before-start) days even if isMarked', () => {
    render(<DayCell date={new Date(2026, 2, 1)} isToday={false} isBeforeStart={true} isFuture={false} isMarked={true} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('bg-surface');
    expect(cell.className).not.toContain('bg-pink-500');
  });
});
