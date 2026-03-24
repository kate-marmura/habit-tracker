import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthNavigator from './MonthNavigator';

describe('MonthNavigator', () => {
  it('renders month/year label in "Month YYYY" format', () => {
    render(<MonthNavigator year={2026} month={3} onPrev={vi.fn()} onNext={vi.fn()} canGoNext={true} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('previous button has correct aria-label and calls onPrev', async () => {
    const onPrev = vi.fn();
    const user = userEvent.setup();
    render(<MonthNavigator year={2026} month={3} onPrev={onPrev} onNext={vi.fn()} canGoNext={true} />);

    const btn = screen.getByRole('button', { name: 'Previous month' });
    await user.click(btn);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('next button has correct aria-label and calls onNext', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<MonthNavigator year={2026} month={3} onPrev={vi.fn()} onNext={onNext} canGoNext={true} />);

    const btn = screen.getByRole('button', { name: 'Next month' });
    await user.click(btn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('next button is disabled and does NOT call onNext when canGoNext is false', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<MonthNavigator year={2026} month={3} onPrev={vi.fn()} onNext={onNext} canGoNext={false} />);

    const btn = screen.getByRole('button', { name: 'Next month' });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('opacity-50');
    await user.click(btn);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('label updates when props change', () => {
    const { rerender } = render(<MonthNavigator year={2026} month={1} onPrev={vi.fn()} onNext={vi.fn()} canGoNext={true} />);
    expect(screen.getByText('January 2026')).toBeInTheDocument();

    rerender(<MonthNavigator year={2025} month={12} onPrev={vi.fn()} onNext={vi.fn()} canGoNext={true} />);
    expect(screen.getByText('December 2025')).toBeInTheDocument();
  });
});
