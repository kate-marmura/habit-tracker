import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { post, ApiError } from '../services/api';

interface RegisterResponse {
  token: string;
  user: { id: string; email: string };
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
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
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
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
      const data = await post<RegisterResponse>('/api/auth/register', { email, password });
      login(data.token, data.user);
      navigate('/habits');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFieldErrors({ email: 'An account with this email already exists' });
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
          <p className="mt-2 text-text-secondary">Create your account</p>
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
              autoComplete="new-password"
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

            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li key={rule.label} className={`text-xs flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-muted'}`}>
                      <span>{passed ? '✓' : '○'}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-pink-500 hover:text-pink-600 font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
