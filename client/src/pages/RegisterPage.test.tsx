import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import RegisterPage from './RegisterPage';

function renderRegister() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  it('renders email and password inputs', () => {
    renderRegister();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors on empty submission', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows password strength feedback as user types', async () => {
    const user = userEvent.setup();
    renderRegister();

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'ab');

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
  });

  it('shows link to login page', () => {
    renderRegister();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });
});
