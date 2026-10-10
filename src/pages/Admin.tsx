import React, { useState } from 'react';
import { useAuth, User, Role } from '../store/auth';
import { useStore } from '../store/store';
import { useToast } from '../components/Toast';
import { ShieldCheck, UserPlus, Users, KeyRound, Ban, CheckCircle, Copy, Settings, Globe } from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  doctor: 'bg-[#E8F4F8] text-[#0E7C86]',
  nurse: 'bg-[#E0F2E8] text-[#23764E]',
  clerk: 'bg-[#FBEFD6] text-[#B7740A]',
  patient: 'bg-gray-100 text-gray-700',
};

export default function Admin() {
  const { users, currentUser, createUser, deactivateUser, reactivateUser, resetPassword, seedDemoStaff } = useAuth();
  const { settings, updateSettings } = useStore();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'doctor' as Role });
  const [tempPass, setTempPass] = useState<{ id: string; pass: string } | null>(null);
  const [tab, setTab] = useState<'users' | 'settings'>('users');
  const [baseUrl, setBaseUrl] = useState(settings.publicBaseUrl || '');

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="p-8 text-center text-[#C62F2F] font-bold">Access Denied</div>;
  }

  const staff = users.filter(u => u.role !== 'patient');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const u = await createUser(form, currentUser);
      if ((u as any)._plainPass) {
        setTempPass({ id: u.id, pass: (u as any)._plainPass });
      }
      toast(`User ${u.name} created`, 'success');
      setShowCreate(false);
      setForm({ name: '', email: '', role: 'doctor' });
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleReset = async (id: string) => {
    if (!window.confirm('Reset this user\'s password?')) return;
    try {
      const pass = await resetPassword(id, undefined, currentUser);
      if (pass) setTempPass({ id, pass });
      toast('Password reset. Temporary password generated.', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleDemoStaff = async () => {
    try {
      const created = await seedDemoStaff(currentUser);
      if (created.length > 0) {
        toast(`Created ${created.length} demo staff accounts`, 'success');
      } else {
        toast('Demo staff accounts already exist', 'info');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleSaveBaseUrl = () => {
    updateSettings({ publicBaseUrl: baseUrl.trim() });
    toast('Public base URL saved', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="text-[#0E7C86]" size={22} /> Administration
          </h1>
          <p className="page-subtitle">Manage staff accounts and application settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-xl font-bold text-sm ${tab === 'users' ? 'bg-[#0E7C86] text-white' : 'btn-secondary'}`}>
            <Users size={15}/> Users
          </button>
          <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-xl font-bold text-sm ${tab === 'settings' ? 'bg-[#0E7C86] text-white' : 'btn-secondary'}`}>
            <Settings size={15}/> Settings
          </button>
        </div>
      </div>

      {/* Temp password banner */}
      {tempPass && (
        <div className="mb-6 card p-5 border-[#23764E] bg-[#E0F2E8]">
          <h3 className="font-bold text-[#23764E] text-base mb-1 flex items-center gap-2"><KeyRound size={16}/> Temporary password</h3>
          <p className="text-sm font-medium text-[#4A5B6B] mb-3">Share this once — it won't be shown again. User must change on first login.</p>
          <div className="flex items-center gap-3">
            <code className="px-4 py-2 bg-white border border-[#23764E]/30 rounded-xl font-mono text-2xl font-bold text-[#12324A]">
              {tempPass.pass}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(tempPass.pass); toast('Copied!', 'success'); }}
              className="p-2 bg-white border border-[#D6E4EA] rounded-lg hover:bg-[#F4F9FB]"
            >
              <Copy size={16}/>
            </button>
          </div>
          <button onClick={() => setTempPass(null)} className="mt-3 text-sm font-bold text-[#4A5B6B] hover:text-[#12324A]">Dismiss</button>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[#12324A] text-lg">Staff Directory</h2>
            <div className="flex gap-2">
              <button onClick={handleDemoStaff} className="btn-secondary py-2 px-3 text-sm">
                Create demo staff
              </button>
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary py-2 px-3 text-sm">
                <UserPlus size={15}/> New Staff
              </button>
            </div>
          </div>

          {showCreate && (
            <div className="card p-6 mb-6 max-w-md">
              <h3 className="font-bold text-[#12324A] mb-4">Create Staff Account</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-1.5">Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-1.5">Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-1.5">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})} className="input-field">
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="clerk">Clerk</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F4F9FB] border-b border-[#D6E4EA]">
                <tr>
                  {['Name', 'Role', 'Status', 'Last Login', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-black text-[#4A5B6B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6E4EA]">
                {staff.map(u => (
                  <tr key={u.id} className="hover:bg-[#F4F9FB] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#12324A]">{u.name}</div>
                      <div className="text-xs text-[#4A5B6B]">{u.email || u.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.active ? (
                        <span className="badge-routine"><CheckCircle size={11}/> Active</span>
                      ) : (
                        <span className="badge-immediate"><Ban size={11}/> Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#4A5B6B] font-medium">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      {u.role !== 'admin' && (
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => handleReset(u.id)} className="text-xs font-bold px-3 py-1.5 bg-[#F4F9FB] border border-[#D6E4EA] rounded-lg hover:bg-white">
                            Reset Pass
                          </button>
                          {u.active ? (
                            <button onClick={() => { if(window.confirm('Deactivate?')) deactivateUser(u.id, currentUser); toast('User deactivated', 'warn'); }} className="text-xs font-bold px-3 py-1.5 bg-[#FCE6E3] text-[#C62F2F] border border-[#C62F2F]/20 rounded-lg hover:bg-[#C62F2F]/20">
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={() => { reactivateUser(u.id, currentUser); toast('User reactivated', 'success'); }} className="text-xs font-bold px-3 py-1.5 bg-[#E0F2E8] text-[#23764E] border border-[#23764E]/20 rounded-lg">
                              Reactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-[#4A5B6B] text-sm font-medium">No staff yet. Click "New Staff" to add one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Settings Tab ── */}
      {tab === 'settings' && (
        <div className="max-w-xl space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-[#12324A] mb-1 flex items-center gap-2">
              <Globe size={16} className="text-[#0E7C86]" /> Public Base URL
            </h3>
            <p className="text-sm text-[#4A5B6B] mb-4 leading-relaxed">
              Used to build status / QR links. Defaults to <code className="text-xs bg-[#F4F9FB] px-1.5 py-0.5 rounded border border-[#D6E4EA]">window.location.origin</code>.
              <br />
              <span className="font-semibold">To scan with a phone on LAN:</span> run the dev server with <code className="text-xs bg-[#F4F9FB] px-1.5 py-0.5 rounded border border-[#D6E4EA]">vite --host</code> and set the URL to <code className="text-xs bg-[#F4F9FB] px-1.5 py-0.5 rounded border border-[#D6E4EA]">http://&lt;LAN-IP&gt;:5173</code>.
            </p>
            <div className="flex gap-3">
              <input
                type="url"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={`e.g. ${window.location.origin}`}
                className="input-field flex-1"
              />
              <button onClick={handleSaveBaseUrl} className="btn-primary px-4">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
