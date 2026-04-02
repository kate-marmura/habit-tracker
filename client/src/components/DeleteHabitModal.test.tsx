import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteHabitModal from './DeleteHabitModal';
import type { Habit } from '../types/habit';

vi.mock('../services/api', () => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  cancelPendingRequests: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('../services/habitsApi', () => ({
  deleteHabit: vi.fn(),
}));

const mockHabit: Habit = {
  id: 'abc-123',
  name: 'Exercise',
  description: 'Daily workout',
  startDate: '2026-03-01',
  isArchived: false,
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeleteHabitModal', () => {
  it('renders warning headline with habit name', () => {
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    expect(screen.getByText(/exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
  });

  it('has Delete button disabled until name is typed', () => {
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    expect(deleteBtn).toBeDisabled();
  });

  it('enables Delete button when name matches exactly', async () => {
    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    const input = screen.getByLabelText(/type the habit name/i);
    await user.type(input, 'Exercise');

    expect(screen.getByRole('button', { name: /^delete$/i })).toBeEnabled();
  });

  it('keeps Delete disabled for case-mismatch', async () => {
    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    const input = screen.getByLabelText(/type the habit name/i);
    await user.type(input, 'exercise');

    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled();
  });

  it('calls onDeleted on successful delete', async () => {
    const { deleteHabit } = await import('../services/habitsApi');
    vi.mocked(deleteHabit).mockResolvedValueOnce({ deleted: true });

    const onDeleted = vi.fn();
    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={onDeleted} />);

    await user.type(screen.getByLabelText(/type the habit name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('shows inline error on API failure', async () => {
    const { deleteHabit } = await import('../services/habitsApi');
    vi.mocked(deleteHabit).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    await user.type(screen.getByLabelText(/type the habit name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText(/could not delete habit/i)).toBeInTheDocument();
  });

  it('shows ApiError message inline', async () => {
    const { deleteHabit } = await import('../services/habitsApi');
    const { ApiError } = await import('../services/api');
    vi.mocked(deleteHabit).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Habit not found'));

    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    await user.type(screen.getByLabelText(/type the habit name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText('Habit not found')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={onClose} onDeleted={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={onClose} onDeleted={vi.fn()} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Deleting... while submitting', async () => {
    const { deleteHabit } = await import('../services/habitsApi');
    vi.mocked(deleteHabit).mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<DeleteHabitModal habit={mockHabit} onClose={vi.fn()} onDeleted={vi.fn()} />);

    await user.type(screen.getByLabelText(/type the habit name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});
