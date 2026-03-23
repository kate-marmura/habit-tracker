import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import ResetPasswordPage from './ResetPasswordPage';

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

function LoginSpy() {
  return <div data-testid="login-page">Login Page</div>;
}

function renderPage(initialEntry = '/reset-password/abc123') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/reset-password/:token?" element={<ResetPasswordPage />} />
            <Route path="/login" element={<LoginSpy />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  it('shows invalid link when token param is missing', () => {
    renderPage('/reset-password');
    expect(
      screen.getByText(/this password reset link is invalid or has expired/i),
    ).toBeInTheDocument();
  });

  it('renders new-password and confirm-password fields', () => {
    renderPage();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows client-side mismatch validation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('redirects to /login on successful submit', async () => {
    const { post } = await import('../services/api');
    const mockPost = vi.mocked(post);
    mockPost.mockResolvedValueOnce({ success: true });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('shows invalid/expired-link message on INVALID_RESET_TOKEN', async () => {
    const { post, ApiError } = await import('../services/api');
    const mockPost = vi.mocked(post);
    mockPost.mockRejectedValueOnce(
      new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired'),
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(
      await screen.findByText(/this password reset link is invalid or has expired/i),
    ).toBeInTheDocument();
  });

  it('ignores REQUEST_ABORTED silently', async () => {
    const { post, ApiError } = await import('../services/api');
    const mockPost = vi.mocked(post);
    mockPost.mockRejectedValueOnce(new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled'));

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid or has expired/i)).not.toBeInTheDocument();
  });
});
