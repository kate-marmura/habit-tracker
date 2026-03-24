import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import NavBar from './NavBar';

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

function renderNavBar(initialPath = '/habits') {
  seedAuth();
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <NavBar />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('NavBar', () => {
  it('renders Archived and Settings links and Log out button', () => {
    renderNavBar();
    expect(screen.getByRole('link', { name: /archived/i })).toHaveAttribute('href', '/habits/archived');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('logo links to /habits', () => {
    renderNavBar();
    expect(screen.getByRole('link', { name: /habit tracker/i })).toHaveAttribute('href', '/habits');
  });

  it('highlights the habits destination on /habits', () => {
    renderNavBar('/habits');
    const link = screen.getByRole('link', { name: /habit tracker/i });
    expect(screen.getByRole('banner').className).toContain('bg-pink-50');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the habits destination on habit detail routes', () => {
    renderNavBar('/habits/abc-123');
    const link = screen.getByRole('link', { name: /habit tracker/i });
    expect(screen.getByRole('banner').className).toContain('bg-pink-50');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('highlights Archived link when on /habits/archived', () => {
    renderNavBar('/habits/archived');
    const link = screen.getByRole('link', { name: /archived/i });
    expect(link.className).toContain('text-pink-500');
  });

  it('highlights Settings link when on /settings', () => {
    renderNavBar('/settings');
    const link = screen.getByRole('link', { name: /settings/i });
    expect(link.className).toContain('text-pink-500');
  });

  it('does not highlight Archived or Settings on /habits', () => {
    renderNavBar('/habits');
    expect(screen.getByRole('link', { name: /archived/i }).className).not.toContain('bg-pink-50');
    expect(screen.getByRole('link', { name: /settings/i }).className).not.toContain('bg-pink-50');
  });

  it('uses pink text for inactive nav hover and focus states', () => {
    renderNavBar('/habits');
    expect(screen.getByRole('link', { name: /archived/i }).className).toContain('hover:text-pink-500');
    expect(screen.getByRole('link', { name: /archived/i }).className).toContain(
      'focus-visible:text-pink-500',
    );
    expect(screen.getByRole('button', { name: /log out/i }).className).toContain(
      'focus-visible:text-pink-500',
    );
  });

  it('calls logout on Log out click', async () => {
    renderNavBar();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(localStorage.getItem('token')).toBeNull();
  });
});
