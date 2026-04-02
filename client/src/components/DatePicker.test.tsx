import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  it('renders weekday headers and month label', () => {
    render(<DatePicker value="2026-03-15" onChange={vi.fn()} maxDate="2026-03-31" />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getByRole('grid', { name: /choose start date/i })).toBeInTheDocument();
  });

  it('calls onChange with YYYY-MM-DD when a selectable day is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DatePicker value="2026-03-15" onChange={onChange} maxDate="2026-03-31" />);

    await user.click(screen.getByRole('gridcell', { name: '10' }));
    expect(onChange).toHaveBeenCalledWith('2026-03-10');
  });

  it('disables days after maxDate', () => {
    render(<DatePicker value="2026-03-01" onChange={vi.fn()} maxDate="2026-03-05" />);

    const cells = screen.getAllByRole('gridcell');
    const disabled = cells.filter((c) => (c as HTMLButtonElement).disabled);
    expect(disabled.length).toBeGreaterThan(0);
  });

  it('marks selected value with aria-selected', () => {
    render(<DatePicker value="2026-03-12" onChange={vi.fn()} maxDate="2026-03-31" />);

    const selected = screen.getByRole('gridcell', { name: '12' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
  });

  it('selects focused day on Enter from grid', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DatePicker value="2026-03-15" onChange={onChange} maxDate="2026-03-31" />);

    const grid = screen.getByRole('grid', { name: /choose start date/i });
    grid.focus();
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-03-14');

    vi.useRealTimers();
  });
});
