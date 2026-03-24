import { render, screen, act } from '@testing-library/react';
import ErrorToast from './ErrorToast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ErrorToast', () => {
  it('renders message when provided', () => {
    render(<ErrorToast message="Something went wrong" onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('does not render when message is null', () => {
    render(<ErrorToast message={null} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has accessible role and aria-live', () => {
    render(<ErrorToast message="Error" onDismiss={vi.fn()} />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });
});
