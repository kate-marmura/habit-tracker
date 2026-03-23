import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SettingsPage from './pages/SettingsPage';
import HabitListPage from './pages/HabitListPage';
import ArchivedHabitsPage from './pages/ArchivedHabitsPage';
import HabitCalendarPage from './pages/HabitCalendarPage';

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/habits' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/habits" element={<HabitListPage />} />
      <Route path="/habits/archived" element={<ArchivedHabitsPage />} />
      <Route path="/habits/:id" element={<HabitCalendarPage />} />
    </Routes>
  );
}

export default App;
