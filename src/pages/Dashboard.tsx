import React, { useState } from 'react';
import { useStore, Patient, VisitStatus } from '../store/store';
import { useAuth, can } from '../store/auth';
import { useToast } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TAGS_DICT } from '../engine/lexicon';
import {
  Activity, Clock, ChevronDown, ChevronUp, AlertTriangle,
  Bell, Stethoscope, Users
} from 'lucide-react';

function WaitLabel({ mins }: { mins: number }) {
  const color = mins > 60 ? 'text-[#C62F2F]' : mins > 30 ? 'text-[#B7740A]' : 'text-[#4A5B6B]';
  return <span className={`font-bold text-xs ${color}`}>{mins}m wait</span>;
}

function PatientCard({ p, speed, canAct }: { p: Patient; speed: number; canAct: boolean }) {
  const { markStatus } = useStore();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [showWhy, setShowWhy] = useState(false);

  const waitMins = Math.max(0, Math.floor((Date.now() - (p.arrivalTime ?? Date.now())) / 60_000 * (speed || 1)));
  const pri = p.priority ?? 'Routine';

  const cardBorder = pri === 'Immediate' ? 'border-[#C62F2F]' : pri === 'Soon' ? 'border-[#B7740A]' : 'border-[#23764E]';
  const cardBg    = pri === 'Immediate' ? 'bg-[#FCE6E3]' : pri === 'Soon' ? 'bg-[#FBEFD6]' : 'bg-[#E0F2E8]';
  const badge     = pri === 'Immediate' ? 'badge-immediate' : pri === 'Soon' ? 'badge-soon' : 'badge-routine';

  const handleAction = (status: VisitStatus, label: string) => {
    if (!currentUser) return;
    try {
      markStatus(p.token, status, currentUser);
      toast(`Token #${p.token} marked as ${label}`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Action failed', 'error');
    }
  };

  return (
    <div
      className={`rounded-2xl border-2 ${cardBorder} ${cardBg} ${p.feelingWorseAlert ? 'ring-2 ring-[#C62F2F] ring-offset-1 animate-pulse' : ''} p-4 transition-all`}
      role="article"
      aria-label={`Token ${p.token}, priority ${pri}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg ${pri === 'Immediate' ? 'bg-[#C62F2F] text-white' : pri === 'Soon' ? 'bg-[#B7740A] text-white' : 'bg-[#23764E] text-white'}`}>
            {p.token}
          </div>
          <div>
            <div className="font-bold text-[#12324A] text-sm leading-tight">
              {p.inputs?.name || 'Unknown'}
              <span className="ml-1.5 text-[#4A5B6B] font-medium text-xs">
                {p.inputs?.ageYears ?? '?'}y {(p.inputs?.sex ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={11} className="text-[#4A5B6B]" />
              <WaitLabel mins={waitMins} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-[#4A5B6B] uppercase">Score</div>
          <div className="text-xl font-black text-[#12324A]">{p.urgencyScore ?? 0}</div>
        </div>
      </div>

      {/* Feeling worse alert */}
      {p.feelingWorseAlert && (
        <div className="flex items-center gap-1.5 bg-[#C62F2F] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mb-3">
          <Bell size={12} /> Patient reported feeling worse
        </div>
      )}

      {/* Self-reported + duplicate flags */}
      {(p.flags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(p.flags ?? []).map((f, i) => (
            <span key={i} className="text-[9px] font-bold bg-white/70 text-[#4A5B6B] border border-[#D6E4EA] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Symptom tags */}
      {(p.inputs?.symptomTags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(p.inputs.symptomTags).slice(0, 5).map(t => (
            <span key={t} className="text-[10px] font-semibold bg-white/60 text-[#12324A] px-2 py-0.5 rounded-md border border-[#D6E4EA]">
              {TAGS_DICT[t]?.en ?? t}
            </span>
          ))}
          {(p.inputs.symptomTags).length > 5 && (
            <span className="text-[10px] font-semibold text-[#4A5B6B]">+{p.inputs.symptomTags.length - 5}</span>
          )}
        </div>
      )}

      {/* Reason (short) */}
      {p.systemSuggestion?.reasonLine && (
        <div className="text-[11px] font-medium text-[#4A5B6B] mb-3 leading-snug line-clamp-2">
          {p.systemSuggestion.reasonLine}
        </div>
      )}

      {/* Why panel toggle */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        className="w-full flex items-center justify-between text-xs font-bold text-[#4A5B6B] bg-white/50 px-3 py-2 rounded-lg border border-[#D6E4EA] hover:bg-white/80 mb-3 transition-colors"
        aria-expanded={showWhy}
      >
        Why this priority? {showWhy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showWhy && (
        <div className="bg-white/80 border border-[#D6E4EA] rounded-xl p-3 mb-3 text-xs space-y-2 text-[#4A5B6B]">
          <div>
            <strong className="text-[#12324A] block mb-0.5">Reason:</strong>
            {p.systemSuggestion?.reasonLine ?? 'No reason recorded'}
          </div>
          {p.overrideReason && (
            <div>
              <strong className="text-[#12324A] block mb-0.5">Override reason:</strong>
              {p.overrideReason}
            </div>
          )}
          <div className="border-t border-[#D6E4EA] pt-2 grid grid-cols-2 gap-2">
            <span><strong className="text-[#12324A]">NEWS2:</strong> {p.systemSuggestion?.news2 ?? 'N/A'}</span>
            <span><strong className="text-[#12324A]">Pain:</strong> {p.inputs?.painScore ?? 0}/10</span>
          </div>
          {(p.systemSuggestion?.firedRules ?? []).length > 0 && (
            <div className="border-t border-[#D6E4EA] pt-2">
              <strong className="text-[#12324A] block mb-1">Rules fired:</strong>
              <div className="flex flex-wrap gap-1">
                {(p.systemSuggestion?.firedRules ?? []).map(r => (
                  <span key={r} className="font-mono text-[9px] bg-[#F4F9FB] border border-[#D6E4EA] px-1.5 py-0.5 rounded">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons — hidden for read-only roles */}
      {canAct && (
        <div className="flex gap-2">
          {p.status === 'waiting' && (
            <button
              onClick={() => handleAction('called', 'Called')}
              className="flex-1 py-2 bg-[#0E7C86] hover:bg-[#0B6770] text-white font-bold text-xs rounded-lg transition-colors"
            >
              Call Patient
            </button>
          )}
          {p.status === 'called' && (
            <button
              onClick={() => handleAction('completed', 'Completed')}
              className="flex-1 py-2 bg-[#23764E] hover:bg-[#1a5c3c] text-white font-bold text-xs rounded-lg transition-colors"
            >
              Complete Visit
            </button>
          )}
          {(p.status === 'waiting' || p.status === 'called') && (
            <button
              onClick={() => handleAction('left', 'Left')}
              className="py-2 px-3 bg-white border border-[#D6E4EA] text-[#4A5B6B] font-bold text-xs rounded-lg hover:bg-[#F4F9FB] transition-colors"
              title="Mark as left"
            >
              Left
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityLane({
  title, priority, patients, speed, canAct, emptyMsg,
}: {
  title: string;
  priority: string;
  patients: Patient[];
  speed: number;
  canAct: boolean;
  emptyMsg: string;
}) {
  const sorted = [...patients].sort((a, b) => {
    if ((b.urgencyScore ?? 0) !== (a.urgencyScore ?? 0)) return (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0);
    return (a.arrivalTime ?? 0) - (b.arrivalTime ?? 0);
  });

  const headerClass =
    priority === 'Immediate' ? 'lane-header-immediate' :
    priority === 'Soon'      ? 'lane-header-soon' :
                               'lane-header-routine';

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#D6E4EA] shadow-sm overflow-hidden h-full">
      <div className={`${headerClass} px-4 py-3 flex items-center justify-between`}>
        <h2 className="font-black text-base tracking-tight">{title}</h2>
        <span className="font-black text-lg">{sorted.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {sorted.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-[#4A5B6B] border-2 border-dashed border-[#D6E4EA] rounded-xl text-sm font-medium gap-2">
            <Users size={24} className="opacity-40" />
            {emptyMsg}
          </div>
        ) : (
          sorted.map(p => (
            <ErrorBoundary key={p.token} fallbackLabel="Card error">
              <PatientCard p={p} speed={speed} canAct={canAct} />
            </ErrorBoundary>
          ))
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { patients, settings, seedDemoPatients, updateSettings } = useStore();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<'waiting' | 'active' | 'all'>('waiting');

  const role = currentUser?.role;
  const canAct = can(role, 'viewDashboardActions');

  // Defensive filter
  let filtered: Patient[];
  try {
    filtered = (patients ?? []).filter(p => {
      if (!p || !p.status) return filterMode === 'all';
      if (filterMode === 'waiting') return p.status === 'waiting';
      if (filterMode === 'active') return p.status === 'waiting' || p.status === 'called';
      return true;
    });
  } catch (err) {
    console.error('[Dashboard] filter error', err);
    filtered = [];
  }

  const immed   = filtered.filter(p => p.priority === 'Immediate');
  const soon    = filtered.filter(p => p.priority === 'Soon');
  const routine = filtered.filter(p => p.priority === 'Routine');

  const hasImmediates = immed.length > 0;

  const handleSeed = () => {
    if (!currentUser) return;
    try {
      seedDemoPatients(currentUser);
      toast('Demo patients seeded', 'success');
    } catch (err: any) {
      toast(err?.message || 'Seed failed', 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#F4F9FB]">
      {/* Alarm banner for Immediate */}
      {hasImmediates && (
        <div className="bg-[#C62F2F] text-white px-6 py-2 flex items-center gap-2 text-sm font-bold">
          <AlertTriangle size={16} className="animate-pulse" />
          {immed.length} IMMEDIATE patient{immed.length !== 1 ? 's' : ''} — attention required
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#D6E4EA]">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Stethoscope className="text-[#0E7C86]" size={22} />
            Clinical Dashboard
          </h1>
          <p className="page-subtitle">
            Live triage · {filterMode} view · {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            {!canAct && <span className="ml-2 text-[#B7740A] font-bold">(read-only)</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as any)}
            className="input-field py-1.5 w-auto text-sm"
            aria-label="Filter visits"
          >
            <option value="waiting">Waiting only</option>
            <option value="active">Active (Waiting + Called)</option>
            <option value="all">All today</option>
          </select>

          <button
            onClick={() => updateSettings({ demoSpeed: settings.demoSpeed > 1 ? 1 : 60 })}
            className={`btn-secondary py-1.5 px-3 text-sm ${settings.demoSpeed > 1 ? 'text-purple-700 border-purple-300' : ''}`}
          >
            <Clock size={14} /> Speed: {settings.demoSpeed}×
          </button>

          {role === 'admin' && (
            <button onClick={handleSeed} className="btn-secondary py-1.5 px-3 text-sm">
              Seed Scenarios
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <ErrorBoundary fallbackLabel="Immediate lane error">
          <PriorityLane title="Immediate" priority="Immediate" patients={immed} speed={settings.demoSpeed} canAct={canAct} emptyMsg="No immediate patients" />
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Soon lane error">
          <PriorityLane title="Soon" priority="Soon" patients={soon} speed={settings.demoSpeed} canAct={canAct} emptyMsg="No soon patients" />
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Routine lane error">
          <PriorityLane title="Routine" priority="Routine" patients={routine} speed={settings.demoSpeed} canAct={canAct} emptyMsg="No routine patients" />
        </ErrorBoundary>
      </div>
    </div>
  );
}
