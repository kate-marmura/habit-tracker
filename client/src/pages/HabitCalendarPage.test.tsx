import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import HabitCalendarPage from './HabitCalendarPage';
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
  fetchActiveHabits: vi.fn(),
  fetchArchivedHabits: vi.fn(),
  fetchHabitById: vi.fn(),
  updateHabit: vi.fn(),
  archiveHabit: vi.fn(),
  unarchiveHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

function createMockToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.mock-signature`;
}

function seedAuth() {
  localStorage.setItem('token', createMockToken());
  localStorage.setItem('user', JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }));
}

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
  localStorage.clear();
  vi.restoreAllMocks();
});

function HabitsListStub() {
  return <div data-testid="habits-list-page">Habits List</div>;
}

function renderPage(habitId = 'abc-123') {
  seedAuth();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[`/habits/${habitId}`]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/habits" element={<HabitsListStub />} />
            <Route path="/habits/:id" element={<HabitCalendarPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function renderPageWithoutHabitIdParam() {
  seedAuth();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/other']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/other" element={<HabitCalendarPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('HabitCalendarPage', () => {
  it('shows invalid link error when route has no habit id (no infinite loading)', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    renderPageWithoutHabitIdParam();

    expect(await screen.findByText(/this habit link is invalid/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading habit/i)).not.toBeInTheDocument();
    expect(vi.mocked(fetchHabitById)).not.toHaveBeenCalled();
  });

  it('shows loading state initially', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText(/loading habit/i)).toBeInTheDocument();
  });

  it('fetches and displays habit name on mount', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();

    expect(await screen.findByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Daily workout')).toBeInTheDocument();
    expect(screen.getByText(/started 2026-03-01/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderPage();

    expect(await screen.findByText(/could not load habit/i)).toBeInTheDocument();
  });

  it('shows API error message', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    const { ApiError } = await import('../services/api');
    vi.mocked(fetchHabitById).mockRejectedValueOnce(
      new ApiError(404, 'NOT_FOUND', 'Habit not found'),
    );

    renderPage();

    expect(await screen.findByText('Habit not found')).toBeInTheDocument();
  });

  it('has back to habits link', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.getByRole('link', { name: /back to habits/i })).toHaveAttribute('href', '/habits');
  });

  it('shows settings dropdown with edit option', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
  });

  it('opens edit modal from dropdown', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    expect(screen.getByText(/edit habit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Exercise');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Daily workout');
  });

  it('updates habit name via edit modal', async () => {
    const { fetchHabitById, updateHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(updateHabit).mockResolvedValueOnce({
      ...mockHabit,
      name: 'Morning Run',
      updatedAt: '2026-03-23T12:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Morning Run');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Morning Run')).toBeInTheDocument();
    expect(screen.queryByText(/edit habit/i)).not.toBeInTheDocument();
  });

  it('shows validation error for empty name in edit modal', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it('shows network error in edit modal', async () => {
    const { fetchHabitById, updateHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(updateHabit).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/could not update habit/i)).toBeInTheDocument();
  });

  it('shows start date read-only in edit modal', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    expect(screen.getByText(/start date:/i)).toBeInTheDocument();
    expect(screen.getByText('2026-03-01')).toBeInTheDocument();
  });

  it('shows Archive option in settings dropdown for active habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument();
  });

  it('shows settings dropdown with only Unarchive for archived habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.getByRole('menuitem', { name: /unarchive/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument();
  });

  it('opens ConfirmModal on archive and navigates to /habits on confirm', async () => {
    const { fetchHabitById, archiveHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(archiveHabit).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /archive/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/archive/i, { selector: 'h2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(await screen.findByTestId('habits-list-page')).toBeInTheDocument();
  });

  it('does not archive when ConfirmModal is cancelled', async () => {
    const { fetchHabitById, archiveHabit } = await import('../services/habitsApi');
    vi.mocked(archiveHabit).mockClear();
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /archive/i }));

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(vi.mocked(archiveHabit)).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
  });

  it('shows error in ConfirmModal when archive API fails', async () => {
    const { fetchHabitById, archiveHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(archiveHabit).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /archive/i }));

    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows Archived badge for an archived habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    renderPage();
    expect(await screen.findByText('Archived')).toBeInTheDocument();
  });

  it('does not show Edit or Archive in dropdown for archived habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.queryByRole('menuitem', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument();
  });

  it('does not show Archived badge for an active habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('unarchives habit and navigates to /habits', async () => {
    const { fetchHabitById, unarchiveHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });
    vi.mocked(unarchiveHabit).mockResolvedValueOnce({ ...mockHabit, isArchived: false });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /unarchive/i }));

    expect(await screen.findByTestId('habits-list-page')).toBeInTheDocument();
  });

  it('shows HABIT_LIMIT_REACHED error when unarchiving with 10 active habits', async () => {
    const { fetchHabitById, unarchiveHabit } = await import('../services/habitsApi');
    const { ApiError } = await import('../services/api');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });
    vi.mocked(unarchiveHabit).mockRejectedValueOnce(
      new ApiError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.'),
    );

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /unarchive/i }));

    expect(await screen.findByText('You can have up to 10 active habits.')).toBeInTheDocument();
  });

  it('shows generic error when unarchive API fails with network error', async () => {
    const { fetchHabitById, unarchiveHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });
    vi.mocked(unarchiveHabit).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /unarchive/i }));

    expect(await screen.findByText(/could not unarchive habit/i)).toBeInTheDocument();
  });

  it('does not show Unarchive for an active habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.queryByRole('menuitem', { name: /unarchive/i })).not.toBeInTheDocument();
  });

  it('shows Delete option in dropdown for active habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('shows Delete option in dropdown for archived habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens delete modal from dropdown and navigates on success', async () => {
    const { fetchHabitById, deleteHabit } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(deleteHabit).mockResolvedValueOnce({ deleted: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /habit settings/i }));
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/type the habit name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByTestId('habits-list-page')).toBeInTheDocument();
  });
});
