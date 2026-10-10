import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useToast } from '../components/Toast';
import { Eye, EyeOff, Activity, Loader2, HeartPulse, ShieldCheck, Zap } from 'lucide-react';

/** Left-panel animated healthcare illustration built purely with SVG + CSS */
function HealthcareIllustration() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-10 gradient-bg overflow-hidden">
      {/* Floating medical crosses */}
      <svg className="absolute top-10 right-12 w-10 h-10 opacity-30 float-cross" viewBox="0 0 24 24" fill="white">
        <rect x="10" y="3" width="4" height="18" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/>
      </svg>
      <svg className="absolute bottom-20 left-8 w-7 h-7 opacity-25 float-cross" viewBox="0 0 24 24" fill="white">
        <rect x="10" y="3" width="4" height="18" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/>
      </svg>
      <svg className="absolute top-1/3 left-6 w-5 h-5 opacity-20 float-cross" viewBox="0 0 24 24" fill="white">
        <rect x="10" y="3" width="4" height="18" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/>
      </svg>

      {/* Animated heart / shield icon */}
      <div className="pulse-heart mb-8">
        <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
          <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <path d="M40 56s-18-12-18-24a10 10 0 0120 0 10 10 0 0120 0c0 12-22 24-22 24z" fill="white" opacity="0.9"/>
        </svg>
      </div>

      {/* ECG line */}
      <svg viewBox="0 0 300 60" width="260" height="50" className="mb-10 opacity-70">
        <path
          d="M0 30 L40 30 L55 10 L65 50 L80 5 L95 55 L110 30 L180 30 L195 18 L205 42 L215 30 L300 30"
          fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="ecg-line"
        />
      </svg>

      <div className="text-center text-white z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Activity className="h-8 w-8" />
          <span className="text-3xl font-black tracking-tight">OPD Flow</span>
        </div>
        <h1 className="text-2xl font-bold leading-snug mb-8 opacity-95">
          Right patient.<br/>Right priority.<br/>Right now.
        </h1>

        <div className="space-y-3">
          {[
            { icon: <Zap size={16}/>, text: 'Rules decide, humans approve' },
            { icon: <HeartPulse size={16}/>, text: 'Human override always' },
            { icon: <ShieldCheck size={16}/>, text: 'Every action audited' },
          ].map((chip, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white/15 border border-white/25 text-white rounded-xl px-4 py-2.5 text-sm font-semibold backdrop-blur-sm">
              {chip.icon}
              {chip.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const { login, seedAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { seedAdmin(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    if (!identifier.trim()) { setFieldError('Email or mobile is required'); return; }
    if (!password) { setFieldError('Password is required'); return; }

    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result === true) {
        const user = useAuth.getState().currentUser!;
        toast(`Welcome back, ${user.name}!`, 'success');
        if (user.role === 'admin') navigate('/admin/users', { replace: true });
        else if (user.role === 'patient') navigate('/my-visit', { replace: true });
        else if (user.role === 'clerk') navigate('/register', { replace: true });
        else navigate('/dashboard', { replace: true });
      } else {
        setFieldError(result as string);
        toast(result as string, 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error during login.';
      setFieldError(msg);
      toast(msg, 'error');
      console.error('[Login]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2">
        <HealthcareIllustration />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#F4F9FB]">
        <div className="w-full max-w-md">
          {/* Logo (mobile only) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Activity className="text-[#0E7C86] h-7 w-7" />
            <span className="font-black text-xl text-[#12324A]">OPD Flow</span>
          </div>

          <div className="card p-8 md:p-10">
            <h2 className="text-2xl font-black text-[#12324A] mb-1">Welcome back</h2>
            <p className="text-sm font-medium text-[#4A5B6B] mb-8">Sign in to continue to OPD Flow</p>

            {fieldError && (
              <div className="mb-6 bg-[#FCE6E3] border border-[#C62F2F]/30 text-[#C62F2F] px-4 py-3 rounded-xl text-sm font-semibold">
                {fieldError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="login-identifier" className="block text-sm font-bold text-[#12324A] mb-1.5">
                  Email or Mobile Number
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  className="input-field"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="admin@gmail.com or 10-digit mobile"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-bold text-[#12324A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input-field pr-12"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5B6B] hover:text-[#12324A] p-1"
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3 text-base mt-2"
                disabled={loading}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#D6E4EA] text-center">
              <p className="text-sm font-medium text-[#4A5B6B]">
                Patient?{' '}
                <Link to="/signup" className="text-[#2563EB] hover:underline font-bold">
                  Register for self check-in
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-[#4A5B6B] max-w-xs mx-auto leading-relaxed">
            Prototype with client-side demo authentication. Do not enter real patient data.
          </p>
        </div>
      </div>
    </div>
  );
}
