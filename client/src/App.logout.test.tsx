import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import { cancelPendingRequests, ApiError } from './services/api';

function createMockToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.mock-signature`;
}

function seedAuth() {
  const token = createMockToken();
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }));
  return token;
}

function renderApp(initialRoute = '/habits') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Logout', () => {
  it('clears localStorage token and user when logout is clicked', async () => {
    seedAuth();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('redirects user to /login after logout', async () => {
    seedAuth();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('resets authenticated UI to unauthenticated state', async () => {
    seedAuth();
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });
  });
});

function mockFetchWithAbort() {
  const abortSpy = vi.fn();
  vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = (init as RequestInit)?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          abortSpy();
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      }
    });
  });
  return abortSpy;
}

describe('cancelPendingRequests', () => {
  it('aborts active requests and clears the controller registry', async () => {
    const abortSpy = mockFetchWithAbort();

    const { get } = await import('./services/api');
    const requestPromise = get('/test').catch((err: unknown) => err);

    cancelPendingRequests();

    const error = (await requestPromise) as ApiError;
    expect(abortSpy).toHaveBeenCalled();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('REQUEST_ABORTED');
  });

  it('does not surface a user-facing network error on abort', async () => {
    mockFetchWithAbort();

    const { get } = await import('./services/api');
    const requestPromise = get('/test').catch((err: unknown) => err);

    cancelPendingRequests();

    const error = (await requestPromise) as ApiError;
    expect(error.code).toBe('REQUEST_ABORTED');
    expect(error.message).not.toContain('Could not connect');
    expect(error.status).toBe(0);
  });
});
