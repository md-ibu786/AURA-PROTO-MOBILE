import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RecorderPage from './pages/RecorderPage';
import './index.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">AURA</div>
      <div className="loading-spinner" />
    </div>
  );
}

export default function App() {
  const { user, profile, loading, error, login, logout } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user || !profile) {
    return <LoginPage onLogin={login} error={error} loading={loading} />;
  }

  return (
    <RecorderPage
      userName={profile.displayName}
      userRole={profile.role}
      onLogout={logout}
    />
  );
}
