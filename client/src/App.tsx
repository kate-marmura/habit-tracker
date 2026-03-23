import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';

function HabitsPlaceholder() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-pink-500 mb-4">Habbit Tracker</h1>
        <p className="text-text-secondary">Habits page — coming in E3</p>
        {isAuthenticated && (
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              to="/settings"
              className="px-6 py-2 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition font-medium text-sm"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-6 py-2 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition font-medium text-sm"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ForgotPasswordPlaceholder() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-text-secondary">Forgot password — coming in E2-S5</p>
    </div>
  );
}

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
      <Route path="/forgot-password" element={<ForgotPasswordPlaceholder />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/habits" element={<HabitsPlaceholder />} />
    </Routes>
  );
}

export default App;
