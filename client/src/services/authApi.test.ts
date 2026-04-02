import { login, register, forgotPassword, resetPassword, changePassword } from './authApi';

vi.mock('./api', () => ({
  post: vi.fn(),
  put: vi.fn(),
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('login calls POST /api/auth/login', async () => {
    const { post } = await import('./api');
    const mockPost = vi.mocked(post);
    const response = { token: 't', user: { id: '1', email: 'a@b.com' } };
    mockPost.mockResolvedValueOnce(response);

    const result = await login('a@b.com', 'pass');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
      email: 'a@b.com',
      password: 'pass',
    });
    expect(result).toEqual(response);
  });

  it('register calls POST /api/auth/register', async () => {
    const { post } = await import('./api');
    const mockPost = vi.mocked(post);
    const response = { token: 't', user: { id: '1', email: 'a@b.com' } };
    mockPost.mockResolvedValueOnce(response);

    const result = await register('a@b.com', 'pass');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register', {
      email: 'a@b.com',
      password: 'pass',
    });
    expect(result).toEqual(response);
  });

  it('forgotPassword calls POST /api/auth/forgot-password', async () => {
    const { post } = await import('./api');
    const mockPost = vi.mocked(post);
    mockPost.mockResolvedValueOnce({ message: 'ok' });

    const result = await forgotPassword('a@b.com');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'a@b.com' });
    expect(result).toEqual({ message: 'ok' });
  });

  it('resetPassword calls POST /api/auth/reset-password', async () => {
    const { post } = await import('./api');
    const mockPost = vi.mocked(post);
    mockPost.mockResolvedValueOnce({ message: 'ok' });

    const result = await resetPassword('tok', 'newpass');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/reset-password', {
      token: 'tok',
      newPassword: 'newpass',
    });
    expect(result).toEqual({ message: 'ok' });
  });

  it('changePassword calls PUT /api/auth/change-password', async () => {
    const { put } = await import('./api');
    const mockPut = vi.mocked(put);
    mockPut.mockResolvedValueOnce(undefined);

    await changePassword('old', 'new');

    expect(mockPut).toHaveBeenCalledWith('/api/auth/change-password', {
      currentPassword: 'old',
      newPassword: 'new',
    });
  });
});
