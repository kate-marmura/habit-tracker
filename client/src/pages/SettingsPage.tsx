import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../services/api';
import { changePassword as changePasswordApi } from '../services/authApi';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validateFields(): boolean {
    const errors: typeof fieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

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

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm your new password';
    } else if (confirmNewPassword !== newPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);

    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        if (err.code === 'INVALID_CURRENT_PASSWORD') {
          setFieldErrors({ currentPassword: err.message });
        } else if (err.code === 'PASSWORD_UNCHANGED') {
          setFieldErrors({ newPassword: err.message });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Settings</h1>
          <p className="mt-2 text-text-secondary">Manage your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl shadow-sm border border-border p-8 space-y-6"
        >
          <h2 className="text-lg font-semibold text-text">Change Password</h2>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm" role="status">
              Password changed successfully.
            </div>
          )}

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-text mb-1">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (fieldErrors.currentPassword)
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                fieldErrors.currentPassword ? 'border-red-400' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.currentPassword}</p>
            )}
          </div>

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
                if (fieldErrors.newPassword)
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
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
                    <li
                      key={rule.label}
                      className={`text-xs flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-muted'}`}
                    >
                      <span>{passed ? '✓' : '○'}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-text mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                if (fieldErrors.confirmNewPassword)
                  setFieldErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                fieldErrors.confirmNewPassword ? 'border-red-400' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.confirmNewPassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmNewPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Changing password...' : 'Change password'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            <Link to="/habits" className="text-pink-500 hover:text-pink-600 font-medium">
              Back to habits
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
