import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import RegisterPage from './pages/RegisterPage';

function LoginPlaceholder() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-text-secondary">Login page — coming in E2-S2</p>
    </div>
  );
}

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

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/habits' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPlaceholder />} />
      <Route path="/habits" element={<HabitsPlaceholder />} />
    </Routes>
  );
}

export default App;
