import { Link, useLocation } from 'react-router-dom';
import { Archive, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const isArchived = pathname === '/habits/archived';
  const isSettings = pathname === '/settings';
  const isHabits = !isArchived && !isSettings;

  const baseCls =
    'flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-lg transition text-sm font-medium';
  const activeCls = 'bg-pink-50 text-pink-500';
  const inactiveCls = 'text-text-secondary hover:text-pink-500 focus-visible:text-pink-500';
  const headerCls = `border-b border-border ${isHabits ? 'bg-pink-50' : 'bg-surface'}`;

  return (
    <header className={headerCls}>
      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/habits"
          className="min-w-[50%] rounded-lg p-2 -m-2 transition"
          aria-current={isHabits ? 'page' : undefined}
        >
          <h1 className="text-xl font-bold text-pink-500 truncate">Habit Tracker</h1>
          <p className="text-muted text-xs">Let&apos;s start a better life</p>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/habits/archived"
            className={`${baseCls} ${isArchived ? activeCls : inactiveCls}`}
            aria-label="Archived"
          >
            <Archive size={20} />
            <span className="hidden sm:inline">Archived</span>
          </Link>
          <Link
            to="/settings"
            className={`${baseCls} ${isSettings ? activeCls : inactiveCls}`}
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className={`${baseCls} ${inactiveCls}`}
            aria-label="Log out"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline whitespace-nowrap">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
