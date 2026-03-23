import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { post, ApiError } from '../services/api';

interface LoginResponse {
  token: string;
  user: { id: string; email: string };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  function validateFields(): boolean {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setTouched({ email: true, password: true });

    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      const data = await post<LoginResponse>('/api/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/habits');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') {
          return;
        }
        if (err.status === 401) {
          setError('Invalid email or password');
        } else {
          setError(err.message);
        }
      } else {
        setError('Could not connect. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailError = touched.email ? fieldErrors.email : undefined;
  const passwordError = touched.password ? fieldErrors.password : undefined;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Habbit Tracker</h1>
          <p className="mt-2 text-text-secondary">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl shadow-sm border border-border p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                emailError ? 'border-red-400' : 'border-border'
              }`}
              placeholder="you@example.com"
            />
            {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                passwordError ? 'border-red-400' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>

          <div className="space-y-2 text-center text-sm text-text-secondary">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-pink-500 hover:text-pink-600 font-medium">
                Sign up
              </Link>
            </p>
            <p>
              <Link to="/forgot-password" className="text-pink-500 hover:text-pink-600 font-medium">
                Forgot your password?
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
