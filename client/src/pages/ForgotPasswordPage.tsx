import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../services/api';
import { forgotPassword as forgotPasswordApi } from '../services/authApi';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    if (!isValidEmail(email)) {
      setFieldError('Invalid email format');
      return false;
    }
    setFieldError(undefined);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);
    setTouched(true);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_ABORTED') return;
        setError(err.message);
      } else {
        setError('Could not connect. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleFieldError = touched ? fieldError : undefined;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-pink-500">Habit Tracker</h1>
            <p className="text-muted text-sm mt-1">Let&apos;s start a better life</p>
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-border p-8 text-center space-y-4">
            <div className="text-green-600 text-4xl">&#10003;</div>
            <h2 className="text-lg font-semibold text-text">Check your email</h2>
            <p className="text-text-secondary text-sm">
              If an account exists for that email, check your inbox for reset instructions.
            </p>
            <Link
              to="/login"
              className="inline-block mt-4 text-pink-500 hover:text-pink-600 font-medium text-sm"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Habit Tracker</h1>
          <p className="text-muted text-sm mt-1">Let&apos;s start a better life</p>
          <p className="mt-2 text-text-secondary">Reset your password</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="bg-surface rounded-xl shadow-sm border border-border p-8 space-y-6">
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
                if (fieldError) setFieldError(undefined);
              }}
              onBlur={() => setTouched(true)}
              className={`w-full px-4 py-2.5 rounded-lg border bg-background text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                visibleFieldError ? 'border-red-400' : 'border-border'
              }`}
              placeholder="you@example.com"
            />
            {visibleFieldError && <p className="mt-1 text-sm text-red-600">{visibleFieldError}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
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
