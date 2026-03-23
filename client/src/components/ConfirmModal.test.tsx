import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from './ConfirmModal';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConfirmModal', () => {
  it('renders title and message', () => {
    render(
      <ConfirmModal
        title="Archive habit?"
        message="This will move it to archived."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Archive habit?')).toBeInTheDocument();
    expect(screen.getByText('This will move it to archived.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /yes/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel on Escape key', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state while confirming', async () => {
    const onConfirm = vi.fn().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        confirmLabel="Do it"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /do it/i }));
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
  });

  it('shows error when onConfirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Network failed'));
    const user = userEvent.setup();
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network failed');
  });

  it('uses danger styling by default', () => {
    render(
      <ConfirmModal
        title="Delete?"
        message="Sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn.className).toContain('bg-red-500');
  });
});
