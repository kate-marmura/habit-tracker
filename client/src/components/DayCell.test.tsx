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

  it('applies isMutating styling (opacity and pointer-events-none)', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMutating={true} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('opacity-60');
    expect(cell.className).toContain('pointer-events-none');
  });

  it('does not fire onClick when isMutating', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMutating={true} onClick={onClick} />);
    await user.click(screen.getByRole('gridcell'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has transition classes for animation', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} />);
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('transition-all');
    expect(cell.className).toContain('duration-150');
  });

  it('shows cursor-pointer on clickable marked cells', () => {
    const onClick = vi.fn();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} onClick={onClick} />);
    expect(screen.getByRole('gridcell').className).toContain('cursor-pointer');
  });

  it('shows cursor-pointer on clickable today cells', () => {
    const onClick = vi.fn();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={true} isBeforeStart={false} isFuture={false} onClick={onClick} />);
    expect(screen.getByRole('gridcell').className).toContain('cursor-pointer');
  });

  it('does not show cursor-pointer on marked cells without onClick', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} />);
    expect(screen.getByRole('gridcell').className).not.toContain('cursor-pointer');
  });

  it('applies hover:bg-pink-600 to marked cell when onClick is present', () => {
    const onClick = vi.fn();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} onClick={onClick} />);
    expect(screen.getByRole('gridcell').className).toContain('hover:bg-pink-600');
  });

  it('does not apply hover:bg-pink-600 to marked cell without onClick', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} isMarked={true} />);
    expect(screen.getByRole('gridcell').className).not.toContain('hover:bg-pink-600');
  });

  it('applies hover:bg-pink-100 to today unmarked cell when onClick is present', () => {
    const onClick = vi.fn();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={true} isBeforeStart={false} isFuture={false} onClick={onClick} />);
    expect(screen.getByRole('gridcell').className).toContain('hover:bg-pink-100');
  });

  it('does not apply hover:bg-pink-100 to today unmarked cell without onClick', () => {
    render(<DayCell date={new Date(2026, 2, 10)} isToday={true} isBeforeStart={false} isFuture={false} />);
    expect(screen.getByRole('gridcell').className).not.toContain('hover:bg-pink-100');
  });

  it('applies active:scale-[0.97] to interactive cells', () => {
    const onClick = vi.fn();
    render(<DayCell date={new Date(2026, 2, 10)} isToday={false} isBeforeStart={false} isFuture={false} onClick={onClick} />);
    expect(screen.getByRole('gridcell').className).toContain('active:scale-[0.97]');
  });

  it('does not apply active:scale-[0.97] to inactive cells', () => {
    render(<DayCell date={new Date(2026, 2, 1)} isToday={false} isBeforeStart={true} isFuture={false} />);
    expect(screen.getByRole('gridcell').className).not.toContain('active:scale-[0.97]');
  });
});
