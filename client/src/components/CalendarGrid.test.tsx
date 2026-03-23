import { render, screen } from '@testing-library/react';
import CalendarGrid from './CalendarGrid';

describe('CalendarGrid', () => {
  it('renders 7 day-of-week headers', () => {
    render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(7);
    expect(headers.map((h) => h.textContent)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  it('renders correct number of day cells for March 2026 (31 days)', () => {
    render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(31);
  });

  it('renders correct number of day cells for February 2026 (28 days)', () => {
    render(<CalendarGrid year={2026} month={2} habitStartDate="2026-01-01" />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(28);
  });

  it('leading empty cells align first day correctly for March 2026 (starts on Sunday)', () => {
    // March 1, 2026 is a Sunday → getDay() = 0 → 0 leading blanks
    const { container } = render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" />);
    const gridRows = container.querySelectorAll('[role="row"]');
    const dayGrid = gridRows[1];
    // First child should be a gridcell (day 1), not a blank
    expect(dayGrid.firstElementChild?.getAttribute('role')).toBe('gridcell');
    expect(dayGrid.firstElementChild?.textContent).toBe('1');
  });

  it('leading empty cells align first day correctly for April 2026 (starts on Wednesday)', () => {
    // April 1, 2026 is a Wednesday → getDay() = 3 → 3 leading blanks
    const { container } = render(<CalendarGrid year={2026} month={4} habitStartDate="2026-03-01" />);
    const gridRows = container.querySelectorAll('[role="row"]');
    const dayGrid = gridRows[1];
    const children = Array.from(dayGrid.children);
    // First 3 children should be blank (no role="gridcell")
    expect(children[0].getAttribute('role')).toBeNull();
    expect(children[1].getAttribute('role')).toBeNull();
    expect(children[2].getAttribute('role')).toBeNull();
    // 4th child should be day 1
    expect(children[3].getAttribute('role')).toBe('gridcell');
    expect(children[3].textContent).toBe('1');
  });

  it('marks before-start-date days as inactive', () => {
    // Habit starts March 15, so days 1-14 should be before-start
    render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-15" />);
    const cells = screen.getAllByRole('gridcell');

    // Day 1 (index 0) should have inactive styling
    expect(cells[0].className).toContain('bg-surface');
    expect(cells[0].className).toContain('text-muted');

    // Day 14 (index 13) should also be inactive
    expect(cells[13].className).toContain('bg-surface');
    expect(cells[13].className).toContain('text-muted');

    // Day 15 (index 14) should NOT have inactive before-start styling
    expect(cells[14].className).not.toContain('cursor-default');
  });

  it('has grid role and aria-label with month/year', () => {
    render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" />);
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', expect.stringContaining('March'));
    expect(grid).toHaveAttribute('aria-label', expect.stringContaining('2026'));
  });

  it('uses CSS grid with 7 columns', () => {
    const { container } = render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" />);
    const gridRows = container.querySelectorAll('[role="row"]');
    expect(gridRows[0].className).toContain('grid-cols-7');
    expect(gridRows[1].className).toContain('grid-cols-7');
  });

  it('passes markedDates to DayCell — marked days get pink-500 styling', () => {
    const markedDates = new Set(['2026-03-05', '2026-03-15']);
    render(<CalendarGrid year={2026} month={3} habitStartDate="2026-03-01" markedDates={markedDates} />);

    const cells = screen.getAllByRole('gridcell');
    // Day 5 is index 4 (0-based), day 15 is index 14
    expect(cells[4].className).toContain('bg-pink-500');
    expect(cells[14].className).toContain('bg-pink-500');

    // Day 6 (index 5) should NOT be marked
    expect(cells[5].className).not.toContain('bg-pink-500');
  });
});
