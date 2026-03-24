import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UndoToast from './UndoToast';

describe('UndoToast', () => {
  it('renders message and Undo button when message is non-null', () => {
    render(<UndoToast message="Day unmarked" onUndo={vi.fn()} />);
    expect(screen.getByText('Day unmarked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('does not render when message is null', () => {
    render(<UndoToast message={null} onUndo={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls onUndo when Undo button is clicked', async () => {
    const onUndo = vi.fn();
    const user = userEvent.setup();
    render(<UndoToast message="Day unmarked" onUndo={onUndo} />);
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('has accessible role and aria-live', () => {
    render(<UndoToast message="Day unmarked" onUndo={vi.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
