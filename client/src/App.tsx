import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthLayout from './components/AuthLayout';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HabitListPage from './pages/HabitListPage';
import HabitCalendarPage from './pages/HabitCalendarPage';
import NotFoundPage from './pages/NotFoundPage';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ArchivedHabitsPage = lazy(() => import('./pages/ArchivedHabitsPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/habits' : '/login'} replace />;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-text-secondary">Loading...</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/habits" element={<HabitListPage />} />
          <Route path="/habits/archived" element={<ArchivedHabitsPage />} />
          <Route path="/habits/:id" element={<HabitCalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
