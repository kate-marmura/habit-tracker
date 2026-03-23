import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import SettingsPage from './SettingsPage';
import LoginPage from './LoginPage';

vi.mock('../services/api', () => ({
  post: vi.fn(),
  put: vi.fn(),
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

function renderSettings(authenticated = true) {
  if (authenticated) seedAuth();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('renders form fields and submit button', () => {
    renderSettings();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('unauthenticated visit redirects to /login', async () => {
    renderSettings(false);
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
  });

  it('shows client-side mismatch error when confirmation does not match', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText(/current password/i), 'OldPass1');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecure1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits valid data and shows success confirmation', async () => {
    const { put } = await import('../services/api');
    vi.mocked(put).mockResolvedValueOnce({ success: true, message: 'Password changed successfully' });

    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText(/current password/i), 'OldPass1');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecure1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecure1');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/password changed successfully/i)).toBeInTheDocument();
  });

  it('shows current-password error on 401 INVALID_CURRENT_PASSWORD', async () => {
    const { put, ApiError } = await import('../services/api');
    vi.mocked(put).mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect'),
    );

    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText(/current password/i), 'WrongPass1');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecure1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecure1');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });

  it('ignores REQUEST_ABORTED without noisy user-facing error', async () => {
    const { put, ApiError } = await import('../services/api');
    vi.mocked(put).mockRejectedValueOnce(
      new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled'),
    );

    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText(/current password/i), 'OldPass1');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecure1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecure1');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/request cancelled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not connect/i)).not.toBeInTheDocument();
  });
});
