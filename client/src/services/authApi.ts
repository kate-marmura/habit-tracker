import { post, put } from './api';

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface MessageResponse {
  message: string;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/login', { email, password });
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/register', { email, password });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return post<MessageResponse>('/api/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
  return post<MessageResponse>('/api/auth/reset-password', { token, newPassword });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return put<void>('/api/auth/change-password', { currentPassword, newPassword });
}
