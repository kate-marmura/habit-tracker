import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import ForgotPasswordPage from './ForgotPasswordPage';

vi.mock('../services/api', () => ({
  post: vi.fn(),
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

vi.mock('../services/authApi', () => ({
  forgotPassword: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ForgotPasswordPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  it('renders email field and submit button', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders link back to login', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows client-side validation error for empty email on submit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows client-side validation error for malformed email', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
  });

  it('shows neutral success message after successful submit', async () => {
    const { forgotPassword } = await import('../services/authApi');
    vi.mocked(forgotPassword).mockResolvedValueOnce({ message: 'ok' });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/if an account exists for that email, check your inbox/i),
    ).toBeInTheDocument();
  });

  it('shows friendly message on 429 rate limit', async () => {
    const { ApiError } = await import('../services/api');
    const { forgotPassword } = await import('../services/authApi');
    vi.mocked(forgotPassword).mockRejectedValueOnce(
      new ApiError(
        429,
        'RATE_LIMIT_EXCEEDED',
        "You've requested too many password reset emails. Please try again later.",
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/too many password reset emails/i),
    ).toBeInTheDocument();
  });

  it('ignores REQUEST_ABORTED silently', async () => {
    const { ApiError } = await import('../services/api');
    const { forgotPassword } = await import('../services/authApi');
    vi.mocked(forgotPassword).mockRejectedValueOnce(new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled'));

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
  });
});
