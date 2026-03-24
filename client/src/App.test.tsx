import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

function createMockToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.mock-signature`;
}

function seedAuth() {
  localStorage.setItem('token', createMockToken());
  localStorage.setItem('user', JSON.stringify({ id: 'test-user-id', email: 'a@b.com' }));
}

afterEach(() => {
  localStorage.clear();
});

function renderWithProviders(initialRoute = '/habits') {
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

describe('App', () => {
  it('renders without crashing', () => {
    seedAuth();
    renderWithProviders();
    expect(screen.getByText('Habit Tracker')).toBeInTheDocument();
  });

  it('shows NotFoundPage for unknown route when authenticated', async () => {
    seedAuth();
    renderWithProviders('/nonexistent');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to habits/i })).toHaveAttribute('href', '/habits');
    expect(screen.getByText('Habit Tracker')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to login for unknown route', async () => {
    renderWithProviders('/nonexistent');
    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
