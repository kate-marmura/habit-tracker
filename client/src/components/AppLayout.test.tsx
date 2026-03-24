import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import AppLayout from './AppLayout';

function createMockToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.mock-signature`;
}

afterEach(() => {
  localStorage.clear();
});

function renderWithRouter(authenticated: boolean) {
  if (authenticated) {
    localStorage.setItem('token', createMockToken());
    localStorage.setItem('user', JSON.stringify({ id: 'test-user-id', email: 'a@b.com' }));
  }

  return render(
    <MemoryRouter initialEntries={['/habits']}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/habits" element={<div data-testid="habits-page">Habits</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders child route for authenticated user', () => {
    renderWithRouter(true);
    expect(screen.getByTestId('habits-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login', () => {
    renderWithRouter(false);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('habits-page')).not.toBeInTheDocument();
  });
});
