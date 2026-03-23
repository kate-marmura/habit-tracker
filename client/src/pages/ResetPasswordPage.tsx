import { useState, type FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { post, ApiError } from '../services/api';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

function InvalidResetLinkCard() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Habit Tracker</h1>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-8 text-center space-y-4">
          <div className="text-red-500 text-4xl">&#10007;</div>
          <h2 className="text-lg font-semibold text-text">Invalid or expired link</h2>
          <p className="text-text-secondary text-sm">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mt-4 text-pink-500 hover:text-pink-600 font-medium text-sm"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  function validateFields(): boolean {
    const errors: typeof fieldErrors = {};

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      await post('/api/auth/reset-password', { token: token!.trim(), newPassword });
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        if (err.code === 'INVALID_RESET_TOKEN') {
          setInvalidToken(true);
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

  if (!token?.trim()) {
    return <InvalidResetLinkCard />;
  }

  if (invalidToken) {
    return <InvalidResetLinkCard />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Habit Tracker</h1>
          <p className="mt-2 text-text-secondary">Set a new password</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="bg-surface rounded-xl shadow-sm border border-border p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-text mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                fieldErrors.newPassword ? 'border-red-400' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.newPassword}</p>
            )}

            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(newPassword);
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                fieldErrors.confirmPassword ? 'border-red-400' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>

          <div className="text-center text-sm text-text-secondary">
            <Link to="/login" className="text-pink-500 hover:text-pink-600 font-medium">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
