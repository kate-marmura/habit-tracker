import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';

function HabitsPlaceholder() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-pink-500 mb-4">Habbit Tracker</h1>
        <p className="text-text-secondary">Habits page — coming in E3</p>
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
      <Route path="/habits" element={<HabitsPlaceholder />} />
    </Routes>
  );
}

export default App;
