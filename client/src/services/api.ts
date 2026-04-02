const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const activeControllers = new Set<AbortController>();

export function cancelPendingRequests(): void {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  if (response.status === 401) {
    const body = await response.json().catch(() => null);
    const error = body?.error;
    const code = error?.code || 'UNAUTHORIZED';

    // End the client session unless the 401 is a "wrong password" style response where
    // the user should stay signed in (change-password, login form, etc.).
    const keepSessionOn401 = new Set(['INVALID_CURRENT_PASSWORD', 'INVALID_CREDENTIALS']);
    if (!keepSessionOn401.has(code)) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (hadToken) {
        window.location.href = '/login';
      }
    }

    throw new ApiError(401, code, error?.message || 'Authentication required');
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const message = retryAfter
      ? `Too many attempts. Please try again in ${retryAfter} seconds.`
      : 'Too many attempts. Please try again later.';
    throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
  }

  const body = await response.json().catch(() => null);
  const error = body?.error;
  throw new ApiError(
    response.status,
    error?.code || 'UNKNOWN_ERROR',
    error?.message || 'An unexpected error occurred',
  );
}

async function trackedFetch<T>(path: string, method: string, data?: unknown): Promise<T> {
  const controller = new AbortController();
  activeControllers.add(controller);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    return await handleResponse<T>(response);
  } catch (error) {
    const isAbortError =
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError');
    if (isAbortError) {
      throw new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not connect to the server. Please check your internet connection and try again.',
    );
  } finally {
    activeControllers.delete(controller);
  }
}

export async function post<T>(path: string, data?: unknown): Promise<T> {
  return trackedFetch<T>(path, 'POST', data);
}

export async function get<T>(path: string): Promise<T> {
  return trackedFetch<T>(path, 'GET');
}

export async function put<T>(path: string, data?: unknown): Promise<T> {
  return trackedFetch<T>(path, 'PUT', data);
}

export async function patch<T>(path: string, data?: unknown): Promise<T> {
  return trackedFetch<T>(path, 'PATCH', data);
}

export async function del<T>(path: string): Promise<T> {
  return trackedFetch<T>(path, 'DELETE');
}

export { ApiError };
