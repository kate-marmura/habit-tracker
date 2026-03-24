import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import HabitListPage from './HabitListPage';
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
  archiveHabit: vi.fn(),
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

const mockHabits: Habit[] = [
  {
    id: '1',
    name: 'Exercise',
    description: 'Daily workout',
    startDate: '2026-03-01',
    isArchived: false,
    createdAt: '2026-03-23T12:00:00.000Z',
    updatedAt: '2026-03-23T12:00:00.000Z',
  },
  {
    id: '2',
    name: 'Read',
    description: null,
    startDate: '2026-03-10',
    isArchived: false,
    createdAt: '2026-03-22T12:00:00.000Z',
    updatedAt: '2026-03-22T12:00:00.000Z',
  },
];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function renderPage() {
  seedAuth();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/habits']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HabitListPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('HabitListPage', () => {
  it('shows loading state initially', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText(/loading habits/i)).toBeInTheDocument();
  });

  it('fetches and displays active habits on mount', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);

    renderPage();

    expect(await screen.findByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Daily workout')).toBeInTheDocument();
  });

  it('renders habit cards with links to calendar routes', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);

    renderPage();

    const exerciseLink = await screen.findByRole('link', { name: /view calendar for exercise/i });
    expect(exerciseLink).toHaveAttribute('href', '/habits/1');

    const readLink = screen.getByRole('link', { name: /view calendar for read/i });
    expect(readLink).toHaveAttribute('href', '/habits/2');
  });

  it('shows empty state when no active habits', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText(/create your first habit/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ create a habit/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderPage();

    expect(await screen.findByText(/could not load habits/i)).toBeInTheDocument();
  });

  it('shows API error message on ApiError', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    const { ApiError } = await import('../services/api');
    vi.mocked(fetchActiveHabits).mockRejectedValueOnce(
      new ApiError(500, 'SERVER_ERROR', 'Internal server error'),
    );

    renderPage();

    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
  });

  it('renders the create habit button', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText(/create your first habit/i);
    expect(screen.getByRole('button', { name: /new habit/i })).toBeInTheDocument();
  });

  it('opens create modal on button click', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/create your first habit/i);

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    expect(screen.getByText(/create a new habit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
  });

  it('adds new habit to list after successful creation', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    const { post } = await import('../services/api');
    vi.mocked(post).mockResolvedValueOnce({
      id: '3',
      name: 'Meditate',
      description: null,
      startDate: '2026-03-23',
      isArchived: false,
      createdAt: '2026-03-23T12:00:00.000Z',
      updatedAt: '2026-03-23T12:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/create your first habit/i);

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Meditate');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(await screen.findByText('Meditate')).toBeInTheDocument();
    expect(screen.queryByText(/create a new habit/i)).not.toBeInTheDocument();
  });

  it('does not render per-page header nav (NavBar handles it)', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText(/create your first habit/i);

    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('retries fetch when Try again is clicked', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockHabits);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/could not load habits/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Exercise')).toBeInTheDocument();
  });

  it('shows limit-reached error from API when creating', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    const { post, ApiError } = await import('../services/api');
    vi.mocked(post).mockRejectedValueOnce(
      new ApiError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.'),
    );

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/create your first habit/i);

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Overflow');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(await screen.findByText(/up to 10 active habits/i)).toBeInTheDocument();
  });

  it('shows network error message when create fails', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce([]);

    const { post } = await import('../services/api');
    vi.mocked(post).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/create your first habit/i);

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Test');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(await screen.findByText(/could not create habit/i)).toBeInTheDocument();
  });

  it('opens edit modal from habit card Edit button', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /edit exercise/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens archive ConfirmModal from habit card Archive button', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /archive exercise/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/archive/i, { selector: 'h2' })).toBeInTheDocument();
  });

  it('removes habit from list after successful archive', async () => {
    const { fetchActiveHabits, archiveHabit } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);
    vi.mocked(archiveHabit).mockResolvedValueOnce({ ...mockHabits[0], isArchived: true });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /archive exercise/i }));
    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    await vi.waitFor(() => {
      expect(screen.queryByText('Exercise')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('opens delete modal from habit card Delete button', async () => {
    const { fetchActiveHabits } = await import('../services/habitsApi');
    vi.mocked(fetchActiveHabits).mockResolvedValueOnce(mockHabits);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Exercise');

    await user.click(screen.getByRole('button', { name: /delete exercise/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
