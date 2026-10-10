import React, { useState, useEffect } from 'react';
import { getAuditLog, verifyAuditChain, simulateTampering, AuditEntry } from '../store/audit';
import { useToast } from '../components/Toast';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, AlertTriangle, Search } from 'lucide-react';

function PriorityPill({ val }: { val?: string }) {
  if (!val) return <span className="text-[#4A5B6B]">—</span>;
  const cls = val === 'Immediate' ? 'badge-immediate' : val === 'Soon' ? 'badge-soon' : val === 'Routine' ? 'badge-routine' : 'text-xs font-bold text-[#4A5B6B]';
  return <span className={cls}>{val}</span>;
}

export default function Audit() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [filterToken, setFilterToken] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);
  const { toast } = useToast();

  const loadLog = () => {
    try { setLog(getAuditLog().reverse()); } catch { setLog([]); }
  };

  useEffect(() => {
    loadLog();
    const bc = new BroadcastChannel('opd_audit_sync');
    bc.onmessage = () => loadLog();
    return () => bc.close();
  }, []);

  const handleVerify = async () => {
    try {
      const passed = await verifyAuditChain();
      setVerificationPassed(passed);
      toast(passed ? 'Chain verified — no tampering detected' : 'Chain FAILED — tampering detected!', passed ? 'success' : 'error');
    } catch (err: any) { toast(err?.message || 'Verification error', 'error'); }
  };

  const handleTamper = () => {
    simulateTampering();
    loadLog();
    handleVerify();
    toast('Tampering simulated', 'warn');
  };

  const exportCsv = () => {
    try {
      const headers = ['Timestamp', 'Token', 'UserId', 'UserName', 'Role', 'Action', 'From', 'To', 'Reason', 'Hash'];
      const rows = log.map(e => [
        new Date(e.timestamp).toISOString(),
        e.token ?? '',
        e.userId ?? '',
        e.userName ?? '',
        e.role ?? '',
        e.action,
        e.from || '',
        e.to || '',
        e.reason || '',
        e.hash,
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `opd_audit_${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('CSV exported', 'success');
    } catch (err: any) { toast(err?.message || 'Export failed', 'error'); }
  };

  const filteredLog = log.filter(e => {
    const tokenMatch = !filterToken || String(e.token ?? '').includes(filterToken);
    const actionMatch = !filterAction || e.action.toLowerCase().includes(filterAction.toLowerCase());
    return tokenMatch && actionMatch;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldAlert className="text-[#0E7C86]" size={22} /> Audit Log
          </h1>
          <p className="page-subtitle">Cryptographically hash-chained event log · {log.length} entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleVerify} className="btn-secondary py-2 px-3 text-sm gap-2">
            <ShieldCheck size={15}/> Verify Chain
          </button>
          <button onClick={handleTamper} className="btn-secondary py-2 px-3 text-sm gap-2 text-[#C62F2F] border-[#C62F2F]/30">
            <AlertTriangle size={15}/> Simulate Tampering
          </button>
          <button onClick={exportCsv} className="btn-primary py-2 px-3 text-sm gap-2">
            <Download size={15}/> Export CSV
          </button>
        </div>
      </div>

      {verificationPassed === true && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#E0F2E8] border border-[#23764E]/30 rounded-xl font-bold text-[#23764E]">
          <ShieldCheck size={22}/> Audit chain verified — no tampering detected.
        </div>
      )}
      {verificationPassed === false && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#FCE6E3] border border-[#C62F2F]/30 rounded-xl font-bold text-[#C62F2F]">
          <ShieldAlert size={22}/> Verification FAILED — the audit log has been tampered with.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[#D6E4EA] flex flex-wrap items-center gap-3 bg-[#F4F9FB]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5B6B]" />
            <input
              type="text"
              placeholder="Filter by Token…"
              value={filterToken}
              onChange={e => setFilterToken(e.target.value)}
              className="input-field pl-9 py-1.5 w-40 text-sm"
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5B6B]" />
            <input
              type="text"
              placeholder="Filter by Action…"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="input-field pl-9 py-1.5 w-40 text-sm"
            />
          </div>
          <span className="text-xs font-semibold text-[#4A5B6B] ml-auto">{filteredLog.length} entries shown</span>
          <button onClick={loadLog} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={15}/>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F9FB] border-b border-[#D6E4EA]">
              <tr>
                {['Time', 'Token', 'Actor', 'Role', 'Action', 'Change', 'Reason', 'Hash'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-black text-[#4A5B6B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E4EA]">
              {filteredLog.map(entry => (
                <tr key={entry.id} className="hover:bg-[#F4F9FB] transition-colors">
                  <td className="px-4 py-3 text-[#4A5B6B] text-xs whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-[#12324A]">{entry.token != null ? `#${entry.token}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#12324A] text-xs">{entry.userName || entry.userId || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-black uppercase tracking-wide text-[#4A5B6B]">{entry.role || '—'}</td>
                  <td className="px-4 py-3 font-bold text-[#12324A] whitespace-nowrap">{entry.action}</td>
                  <td className="px-4 py-3">
                    {entry.from && entry.to ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <PriorityPill val={entry.from} />
                        <span className="text-[#D6E4EA]">→</span>
                        <PriorityPill val={entry.to} />
                      </span>
                    ) : <PriorityPill val={entry.to} />}
                  </td>
                  <td className="px-4 py-3 text-[#4A5B6B] text-xs italic max-w-[160px] truncate" title={entry.reason}>{entry.reason || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[#D6E4EA] truncate max-w-[80px]" title={entry.hash}>{entry.hash?.slice(0, 8)}</td>
                </tr>
              ))}
              {filteredLog.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[#4A5B6B] font-medium">No audit entries match your filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
