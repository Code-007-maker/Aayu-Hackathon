import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, Stethoscope, ClipboardList, ShieldAlert, Binary,
  CheckSquare, Users, LogOut, User as UserIcon, Settings
} from 'lucide-react';
import { useAuth, can } from './store/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

import Desk      from './pages/Desk';
import Dashboard from './pages/Dashboard';
import Status    from './pages/Status';
import Audit     from './pages/Audit';
import Rules     from './pages/Rules';
import Simulate  from './pages/Simulate';
import Login     from './pages/Login';
import Signup    from './pages/Signup';
import Admin     from './pages/Admin';
import MyVisit   from './pages/MyVisit';

// ── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { currentUser, updateActivity, lastActiveTime, logout } = useAuth();
  const navigate = useNavigate();

  // Idle timeout: warn at 14 min, log out at 15 min
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUser) return;
      const idleMs = Date.now() - lastActiveTime;
      if (idleMs > 15 * 60_000) {
        logout();
        navigate('/login', { replace: true });
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [currentUser, lastActiveTime, logout, navigate]);

  // Reset idle on activity
  useEffect(() => {
    const reset = () => updateActivity();
    window.addEventListener('mousemove', reset, { passive: true });
    window.addEventListener('keypress', reset, { passive: true });
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keypress', reset);
    };
  }, [updateActivity]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (permission && !can(currentUser.role, permission)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

// ── Nav link helper ───────────────────────────────────────────────────────────
function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + '/');
  return (
    <Link to={to} className={`nav-item ${active ? 'nav-item-active text-[#0E7C86]' : ''}`}>
      {icon}<span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

// ── App Shell Layout ──────────────────────────────────────────────────────────
function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!currentUser) return <Outlet />;
  const r = currentUser.role;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F4F9FB] text-[#12324A]">
      {/* Sticky top bar */}
      <nav className="bg-white border-b border-[#D6E4EA] px-4 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center gap-2 mr-6 shrink-0">
          <Activity className="text-[#0E7C86] h-6 w-6" />
          <span className="font-black text-lg text-[#12324A] tracking-tight">OPD Flow</span>
        </Link>

        <div className="flex items-center gap-1 flex-1 flex-wrap">
          {can(r, 'manageUsers') && (
            <NavLink to="/admin/users" icon={<Users size={16}/>} label="Users" />
          )}
          {(r === 'clerk' || r === 'nurse' || can(r, 'manageUsers')) && (
            <NavLink to="/register" icon={<CheckSquare size={16}/>} label="Desk" />
          )}
          {can(r, 'viewDashboard') && (
            <NavLink to="/dashboard" icon={<Stethoscope size={16}/>} label="Dashboard" />
          )}
          {can(r, 'viewAudit') && (
            <NavLink to="/audit" icon={<ShieldAlert size={16}/>} label="Audit" />
          )}
          {can(r, 'viewRules') && (
            <NavLink to="/rules" icon={<ClipboardList size={16}/>} label="Rules" />
          )}
          {can(r, 'viewSimulate') && (
            <NavLink to="/simulate" icon={<Binary size={16}/>} label="Simulate" />
          )}
          {r === 'patient' && (
            <NavLink to="/my-visit" icon={<UserIcon size={16}/>} label="My Visit" />
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="flex items-center gap-2 bg-[#F4F9FB] border border-[#D6E4EA] rounded-xl px-3 py-1.5">
            <span className="font-bold text-sm text-[#12324A]">{currentUser.name}</span>
            <span className="text-[10px] font-black uppercase tracking-wide bg-[#0E7C86] text-white px-1.5 py-0.5 rounded-md">{r}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#4A5B6B] hover:text-[#C62F2F] hover:bg-[#FCE6E3] p-2 rounded-lg transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-[#D6E4EA] text-center py-3 text-xs text-[#4A5B6B] font-medium">
        Advisory decision support. Not a diagnosis. Sample data.
      </footer>
    </div>
  );
}

function Error403() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-10 max-w-sm w-full text-center">
        <div className="text-6xl font-black text-[#D6E4EA] mb-4">403</div>
        <h1 className="text-2xl font-black text-[#12324A] mb-2">Access Denied</h1>
        <p className="text-sm font-medium text-[#4A5B6B] mb-6">You don't have permission to view this page.</p>
        <Link to="/" className="btn-primary">Go to home</Link>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ErrorBoundary fallbackLabel="App error">
          <Routes>
            {/* Public */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/403"    element={<Error403 />} />

            {/* Status page — standalone, no shell nav */}
            <Route
              path="/status/:token"
              element={
                <ErrorBoundary fallbackLabel="Status page error">
                  <Status />
                </ErrorBoundary>
              }
            />

            {/* Shell */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/login" replace />} />

              <Route path="register" element={
                <ProtectedRoute permission="registerPatient">
                  <ErrorBoundary fallbackLabel="Desk error"><Desk /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="dashboard" element={
                <ProtectedRoute permission="viewDashboard">
                  <ErrorBoundary fallbackLabel="Dashboard error"><Dashboard /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="audit" element={
                <ProtectedRoute permission="viewAudit">
                  <ErrorBoundary fallbackLabel="Audit error"><Audit /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="rules" element={
                <ProtectedRoute permission="viewRules">
                  <ErrorBoundary fallbackLabel="Rules error"><Rules /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="simulate" element={
                <ProtectedRoute permission="viewSimulate">
                  <ErrorBoundary fallbackLabel="Simulate error"><Simulate /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="admin/users" element={
                <ProtectedRoute permission="manageUsers">
                  <ErrorBoundary fallbackLabel="Admin error"><Admin /></ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="my-visit" element={
                <ProtectedRoute permission="selfVisit">
                  <ErrorBoundary fallbackLabel="My Visit error"><MyVisit /></ErrorBoundary>
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </BrowserRouter>
  );
}
