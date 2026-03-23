import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import HabitListPage from './HabitListPage';

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
  it('renders the create habit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /new habit/i })).toBeInTheDocument();
  });

  it('shows empty state message', () => {
    renderPage();
    expect(screen.getByText(/no habits yet/i)).toBeInTheDocument();
  });

  it('opens create modal on button click', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    expect(screen.getByText(/create a new habit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
  });

  it('adds new habit to list after successful creation', async () => {
    const { post } = await import('../services/api');
    vi.mocked(post).mockResolvedValueOnce({
      id: '1',
      name: 'Exercise',
      description: null,
      startDate: '2026-03-23',
      isArchived: false,
      createdAt: '2026-03-23T12:00:00.000Z',
      updatedAt: '2026-03-23T12:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Exercise');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(await screen.findByText('Exercise')).toBeInTheDocument();
    expect(screen.queryByText(/create a new habit/i)).not.toBeInTheDocument();
  });

  it('shows limit-reached error from API', async () => {
    const { post, ApiError } = await import('../services/api');
    vi.mocked(post).mockRejectedValueOnce(
      new ApiError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.'),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Overflow');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(await screen.findByText(/up to 10 active habits/i)).toBeInTheDocument();
  });

  it('shows network error message', async () => {
    const { post } = await import('../services/api');
    vi.mocked(post).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /new habit/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Test');
    await user.click(screen.getByRole('button', { name: /create habit/i }));

    expect(
      await screen.findByText(/could not create habit/i),
    ).toBeInTheDocument();
  });
});
