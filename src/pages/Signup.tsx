import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useToast } from '../components/Toast';
import { Eye, EyeOff, Activity, Loader2, AlertCircle } from 'lucide-react';

type Sex = 'male' | 'female' | 'other';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-[#C62F2F] text-xs font-semibold">
      <AlertCircle size={13} />{msg}
    </div>
  );
}

export default function Signup() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [sex, setSex] = useState<Sex>('female');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUpPatient } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!/^\d{10}$/.test(mobile)) e.mobile = 'Must be exactly 10 digits';
    const age = parseFloat(ageYears);
    if (!ageYears || isNaN(age) || age < 0 || age > 120) e.ageYears = 'Enter a valid age (0–120)';
    if (!sex) e.sex = 'Select a sex';
    if (password.length < 8) e.password = 'At least 8 characters required';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast('Please fix the errors below', 'warn'); return; }

    setLoading(true);
    try {
      const res = await signUpPatient(name.trim(), mobile.trim(), password, parseFloat(ageYears), sex, email.trim() || undefined);
      if (res === true) {
        toast('Account created! Please sign in.', 'success');
        navigate('/login');
      } else {
        toast(res as string, 'error');
        setErrors({ form: res as string });
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error during registration.';
      toast(msg, 'error');
      console.error('[Signup]', err);
    } finally {
      setLoading(false);
    }
  };

  const showPregnancy = sex === 'female' && parseFloat(ageYears) >= 10 && parseFloat(ageYears) <= 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F9FB] p-6 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="text-[#0E7C86] h-7 w-7" />
          <span className="font-black text-xl text-[#12324A]">OPD Flow</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-black text-[#12324A] mb-1">Patient Registration</h1>
          <p className="text-sm font-medium text-[#4A5B6B] mb-8">
            Self-service registration for OPD visits. Do not enter real patient data.
          </p>

          {errors.form && (
            <div className="mb-6 bg-[#FCE6E3] border border-[#C62F2F]/30 text-[#C62F2F] px-4 py-3 rounded-xl text-sm font-semibold">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#12324A] mb-1.5">Full Name</label>
              <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="As on ID card" disabled={loading} />
              <FieldError msg={errors.name} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Mobile (10 digits)</label>
                <input type="tel" className="input-field" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9876543210" disabled={loading} />
                <FieldError msg={errors.mobile} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Email (optional)</label>
                <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Age (years)</label>
                <input type="number" step="0.1" min="0" max="120" className="input-field" value={ageYears} onChange={e => setAgeYears(e.target.value)} placeholder="e.g. 28" disabled={loading} />
                <FieldError msg={errors.ageYears} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Sex</label>
                <select className="input-field" value={sex} onChange={e => setSex(e.target.value as Sex)} disabled={loading}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
                <FieldError msg={errors.sex} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#12324A] mb-1.5">Password (min 8 chars)</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input-field pr-12" value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a strong password" disabled={loading} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5B6B]" tabIndex={-1}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FieldError msg={errors.password} />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#12324A] mb-1.5">Confirm Password</label>
              <input type={showPass ? 'text' : 'password'} className="input-field" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" disabled={loading} />
              <FieldError msg={errors.confirm} />
            </div>

            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-bold text-[#4A5B6B] hover:text-[#12324A]">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
