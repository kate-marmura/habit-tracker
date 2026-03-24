import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import ArchivedHabitsPage from './ArchivedHabitsPage';
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
  unarchiveHabit: vi.fn(),
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

const mockArchivedHabits: Habit[] = [
  {
    id: '10',
    name: 'Old Habit',
    description: 'No longer active',
    startDate: '2025-06-01',
    isArchived: true,
    createdAt: '2025-06-01T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
  },
];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function renderPage(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  seedAuth();
  return render(
    <MemoryRouter initialEntries={['/habits/archived']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ArchivedHabitsPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ArchivedHabitsPage', () => {
  it('shows loading state initially', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText(/loading archived habits/i)).toBeInTheDocument();
  });

  it('fetches and displays archived habits on mount', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockResolvedValueOnce(mockArchivedHabits);

    renderPage();

    expect(await screen.findByText('Old Habit')).toBeInTheDocument();
    expect(screen.getByText('No longer active')).toBeInTheDocument();
  });

  it('shows empty state when no archived habits', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText(/no archived habits/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderPage();

    expect(await screen.findByText(/could not load archived habits/i)).toBeInTheDocument();
  });

  it('shows API error message on ApiError', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    const { ApiError } = await import('../services/api');
    vi.mocked(fetchArchivedHabits).mockRejectedValueOnce(
      new ApiError(500, 'SERVER_ERROR', 'Internal server error'),
    );

    renderPage();

    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
  });

  it('has link back to active habits', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText(/no archived habits/i);

    const backLink = screen.getByRole('link', { name: /back to habits/i });
    expect(backLink).toHaveAttribute('href', '/habits');
  });

  it('renders archived habits with ArchivedHabitCard and links', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits).mockResolvedValueOnce(mockArchivedHabits);

    renderPage();

    const habitLink = await screen.findByRole('link', { name: /view archived habit old habit/i });
    expect(habitLink).toHaveAttribute('href', '/habits/10');
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('retries fetch when Try again is clicked', async () => {
    const { fetchArchivedHabits } = await import('../services/habitsApi');
    vi.mocked(fetchArchivedHabits)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockArchivedHabits);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/could not load archived habits/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Old Habit')).toBeInTheDocument();
  });

  it('moves unarchived habit into the active habits cache', async () => {
    const { fetchArchivedHabits, unarchiveHabit } = await import('../services/habitsApi');
    const activeHabit = { ...mockArchivedHabits[0], isArchived: false };
    vi.mocked(fetchArchivedHabits).mockResolvedValueOnce(mockArchivedHabits);
    vi.mocked(unarchiveHabit).mockResolvedValueOnce(activeHabit);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<Habit[]>(['habits'], []);
    queryClient.setQueryData<Habit[]>(['archivedHabits'], mockArchivedHabits);

    const user = userEvent.setup();
    renderPage(queryClient);
    await screen.findByText('Old Habit');

    await user.click(screen.getByRole('button', { name: /unarchive old habit/i }));

    await vi.waitFor(() => {
      expect(queryClient.getQueryData<Habit[]>(['habits'])).toEqual([activeHabit]);
      expect(queryClient.getQueryData<Habit[]>(['archivedHabits'])).toEqual([]);
    });
  });
});
