import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
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
  fetchEntries: vi.fn().mockResolvedValue([]),
  fetchHabitStats: vi.fn().mockResolvedValue({
    currentStreak: 22,
    longestStreak: 34,
    completionRate: 0.95,
    totalDays: 60,
    completedDays: 57,
  }),
  createEntry: vi.fn(),
  deleteEntry: vi.fn().mockResolvedValue(undefined),
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
  startDate: '2026-01-01',
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

function renderCalendarWithRouter(initialPath: string) {
  seedAuth();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/habits/:id',
        element: (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <HabitCalendarPage />
            </AuthProvider>
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
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
    expect(screen.getByText(/started 1 january 2026/i)).toBeInTheDocument();
    expect(screen.queryByText('Daily workout')).not.toBeInTheDocument();
  });

  it('renders StatsPanel with stats from fetchHabitStats below the calendar', async () => {
    const { fetchHabitById, fetchHabitStats } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    expect(vi.mocked(fetchHabitStats)).toHaveBeenCalledWith('abc-123');
    expect(await screen.findByLabelText('Habit statistics')).toBeInTheDocument();
    expect(await screen.findByText('22 days')).toBeInTheDocument();
    expect(screen.getByText('34 days')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('renders CalendarGrid when habit loads successfully', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.queryByText(/calendar coming next/i)).not.toBeInTheDocument();
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

  it('has back to habits link pointing to /habits for active habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.getByRole('link', { name: /back to habits/i })).toHaveAttribute('href', '/habits');
  });

  it('has back to habits link pointing to /habits/archived for archived habit', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({ ...mockHabit, isArchived: true });

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.getByRole('link', { name: /back to habits/i })).toHaveAttribute('href', '/habits/archived');
  });

  it('uses responsive two-column grid layout on desktop', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const { container } = renderPage();
    await screen.findByText('Exercise');

    const gridContainer = container.querySelector('.md\\:grid.md\\:grid-cols-3');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer?.querySelector('.md\\:col-span-2')).toBeInTheDocument();
    expect(gridContainer?.querySelector('.md\\:col-span-1')).toBeInTheDocument();
  });

  it('uses wider max-w-4xl on desktop for header and main', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    const { container } = renderPage();
    await screen.findByText('Exercise');

    const headerInner = container.querySelector('header .md\\:max-w-4xl');
    expect(headerInner).toBeInTheDocument();
    const main = container.querySelector('main.md\\:max-w-4xl');
    expect(main).toBeInTheDocument();
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
    expect(screen.getByText('1 January 2026')).toBeInTheDocument();
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

  it('fetches entries on mount and displays marked dates', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValueOnce([
      { id: 'e1', entryDate: '2026-03-05' },
      { id: 'e2', entryDate: '2026-03-15' },
    ]);

    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      const markedCells = cells.filter((c) => c.className.includes('bg-pink-marked'));
      expect(markedCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows loading entries text while fetching', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockReturnValueOnce(new Promise(() => {}));

    renderPage();
    await screen.findByText('Exercise');

    expect(await screen.findByText(/loading entries/i)).toBeInTheDocument();
  });

  it('optimistically marks a day when clicked', async () => {
    const { fetchHabitById, fetchEntries, createEntry } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 'e-new', entryDate: '2026-03-10' }]);
    vi.mocked(createEntry).mockResolvedValueOnce({ id: 'e-new', entryDate: '2026-03-10' });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
    });

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[9]);

    await vi.waitFor(() => {
      const updatedCells = screen.getAllByRole('gridcell');
      expect(updatedCells[9].className).toContain('bg-pink-marked');
    });

    expect(vi.mocked(createEntry)).toHaveBeenCalledWith(
      'abc-123',
      '2026-03-10',
    );
  });

  it('shows error toast when mark mutation fails', async () => {
    const { fetchHabitById, fetchEntries, createEntry } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([]);
    vi.mocked(createEntry).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
    });

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[9]);

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('optimistically removes mark when clicking a marked day', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[9]);

    await vi.waitFor(() => {
      const updatedCells = screen.getAllByRole('gridcell');
      expect(updatedCells[9].className).not.toContain('bg-pink-marked');
    });

    vi.useRealTimers();
  });

  it('shows undo toast after clicking a marked day', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    await user.click(screen.getAllByRole('gridcell')[9]);
    expect(await screen.findByText('Day unmarked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('restores mark when Undo is clicked and does not call deleteEntry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries, deleteEntry } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
    vi.mocked(deleteEntry).mockResolvedValue(undefined);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    await user.click(screen.getAllByRole('gridcell')[9]);
    await screen.findByText('Day unmarked');

    await user.click(screen.getByRole('button', { name: /undo/i }));

    await vi.waitFor(() => {
      const updatedCells = screen.getAllByRole('gridcell');
      expect(updatedCells[9].className).toContain('bg-pink-marked');
    });

    expect(vi.mocked(deleteEntry)).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('calls deleteEntry after 3-second undo timeout expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries, deleteEntry } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
    vi.mocked(deleteEntry).mockResolvedValue(undefined);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    await user.click(screen.getAllByRole('gridcell')[9]);
    await screen.findByText('Day unmarked');

    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(vi.mocked(deleteEntry)).toHaveBeenCalledWith('abc-123', '2026-03-10');
    });

    vi.useRealTimers();
  });

  it('shows error toast and reverts visual state when deleteEntry fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries, deleteEntry } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
    vi.mocked(deleteEntry).mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    await user.click(screen.getAllByRole('gridcell')[9]);
    await screen.findByText('Day unmarked');

    await vi.advanceTimersByTimeAsync(3000);

    expect(await screen.findByText('Server error')).toBeInTheDocument();

    await vi.waitFor(() => {
      const updatedCells = screen.getAllByRole('gridcell');
      expect(updatedCells[9].className).toContain('bg-pink-marked');
    });

    vi.useRealTimers();
  });

  it('renders MonthNavigator with current month label when habit loads', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    const now = new Date();
    const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });

  it('clicking previous month changes calendar and fetches entries for that month', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const expectedLabel = new Date(prevYear, prevMonth - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    expect(await screen.findByText(expectedLabel)).toBeInTheDocument();

    const expectedMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    await vi.waitFor(() => {
      expect(vi.mocked(fetchEntries)).toHaveBeenCalledWith('abc-123', expectedMonthStr);
    });
  });

  it('next month button is disabled when already at current month', async () => {
    const { fetchHabitById } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);

    renderPage();
    await screen.findByText('Exercise');

    const nextBtn = screen.getByRole('button', { name: 'Next month' });
    expect(nextBtn).toBeDisabled();
  });

  it('disables previous month when viewing the habit start month', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(2026, 2, 20) });
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce({
      ...mockHabit,
      startDate: '2026-03-01',
    });
    vi.mocked(fetchEntries).mockResolvedValue([]);

    renderPage();
    await screen.findByText('Exercise');

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    vi.useRealTimers();
  });

  it('navigating to a different month and back preserves habit name', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(screen.getByText('Exercise')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('Exercise')).toBeInTheDocument();
  });

  it('switching habit ID resets calendar to current month and fetches entries for that month', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    const habitB = { ...mockHabit, id: 'def-456', name: 'Read Books' };
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit).mockResolvedValueOnce(habitB);
    vi.mocked(fetchEntries).mockResolvedValue([]);

    const user = userEvent.setup();
    const { router } = renderCalendarWithRouter('/habits/abc-123');
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    const now = new Date();
    const expectedCurrentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await act(async () => {
      router.navigate('/habits/def-456');
    });

    expect(await screen.findByText('Read Books')).toBeInTheDocument();

    const callsForB = vi.mocked(fetchEntries).mock.calls.filter((c) => c[0] === 'def-456');
    expect(callsForB.some((c) => c[1] === expectedCurrentMonthStr)).toBe(true);
  });

  it('switching habit ID clears undo toast and commits delete for the previous habit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries, deleteEntry } = await import('../services/habitsApi');
    const habitB = { ...mockHabit, id: 'def-456', name: 'Read Books' };
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit).mockResolvedValueOnce(habitB);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
    vi.mocked(deleteEntry).mockResolvedValue(undefined);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { router } = renderCalendarWithRouter('/habits/abc-123');
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    await user.click(screen.getAllByRole('gridcell')[9]);
    expect(await screen.findByText('Day unmarked')).toBeInTheDocument();

    await act(async () => {
      router.navigate('/habits/def-456');
    });

    expect(screen.queryByText('Day unmarked')).not.toBeInTheDocument();
    expect(vi.mocked(deleteEntry)).toHaveBeenCalledWith('abc-123', '2026-03-10');

    vi.useRealTimers();
  });

  it('switching habit ID loads the new habit name in the header', async () => {
    const { fetchHabitById, fetchEntries } = await import('../services/habitsApi');
    const habitB = { ...mockHabit, id: 'def-456', name: 'Meditate' };
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit).mockResolvedValueOnce(habitB);
    vi.mocked(fetchEntries).mockResolvedValue([]);

    const { router } = renderCalendarWithRouter('/habits/abc-123');
    await screen.findByText('Exercise');

    await act(async () => {
      router.navigate('/habits/def-456');
    });

    expect(await screen.findByText('Meditate')).toBeInTheDocument();
    expect(screen.queryByText('Exercise')).not.toBeInTheDocument();
  });

  it('marking a day triggers a stats refetch', async () => {
    const { fetchHabitById, fetchEntries, createEntry, fetchHabitStats } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 'e-new', entryDate: '2026-03-10' }]);
    vi.mocked(createEntry).mockResolvedValueOnce({ id: 'e-new', entryDate: '2026-03-10' });

    const statsMock = vi.mocked(fetchHabitStats);
    statsMock.mockClear();
    statsMock.mockResolvedValue({
      currentStreak: 1,
      longestStreak: 1,
      completionRate: 0.01,
      totalDays: 100,
      completedDays: 1,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
    });

    statsMock.mockClear();

    await user.click(screen.getAllByRole('gridcell')[9]);

    await vi.waitFor(() => {
      expect(statsMock).toHaveBeenCalled();
    });
  });

  it('unmarking a day (after undo expires) triggers a stats refetch', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchHabitById, fetchEntries, deleteEntry, fetchHabitStats } = await import('../services/habitsApi');
    vi.mocked(fetchHabitById).mockResolvedValueOnce(mockHabit);
    vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
    vi.mocked(deleteEntry).mockResolvedValue(undefined);

    const statsMock = vi.mocked(fetchHabitStats);
    statsMock.mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      totalDays: 100,
      completedDays: 0,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Exercise');

    await vi.waitFor(() => {
      const cells = screen.getAllByRole('gridcell');
      expect(cells[9].className).toContain('bg-pink-marked');
    });

    statsMock.mockClear();

    await user.click(screen.getAllByRole('gridcell')[9]);
    await screen.findByText('Day unmarked');

    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(vi.mocked(deleteEntry)).toHaveBeenCalledWith('abc-123', '2026-03-10');
    });

    await vi.waitFor(() => {
      expect(statsMock).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });
});
