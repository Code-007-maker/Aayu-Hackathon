import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { useToast } from '../components/Toast';
import { QRCode } from '../components/QRCode';
import { AlertTriangle, CheckCircle, Activity, Copy, ExternalLink, MapPin } from 'lucide-react';

function buildStatusUrl(token: number, base: string): string {
  return `${(base || window.location.origin).replace(/\/$/, '')}/status/${token}`;
}

export default function Status() {
  const { token } = useParams<{ token: string }>();
  const [alertSent, setAlertSent] = useState(false);
  const { toast } = useToast();

  const { patients, feelingWorse, settings } = useStore(s => ({
    patients: s.patients,
    feelingWorse: s.feelingWorse,
    settings: s.settings,
  }));

  const tokenNum = parseInt(token || '0', 10);
  const patient = patients.find(p => p.token === tokenNum);

  /* ── Not found ────────────────────────────── */
  if (!patient) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="card p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[#F4F9FB] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#D6E4EA]">
            <MapPin className="text-[#4A5B6B] w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#12324A] mb-2">Visit Not Found</h2>
          <p className="text-sm font-medium text-[#4A5B6B] mb-6 leading-relaxed">
            Token #{token} was not found on this device.
          </p>
          <div className="bg-[#FBEFD6] border border-[#B7740A]/30 rounded-xl p-4 text-xs font-medium text-[#B7740A] text-left mb-6">
            <strong>Note:</strong> Visit data is stored in the browser where you registered. If you opened this link on a different device, the visit won't appear here. Please use the same device and browser, or see the desk.
          </div>
          <Link to="/login" className="btn-primary w-full justify-center py-3 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const statusUrl = buildStatusUrl(patient.token, settings?.publicBaseUrl ?? '');

  const getBgClass = (p: string) => {
    if (p === 'Immediate') return 'bg-[#C62F2F]';
    if (p === 'Soon') return 'bg-[#B7740A]';
    return 'bg-[#23764E]';
  };

  const handleWorse = () => {
    try {
      const res = feelingWorse(patient.token);
      if (typeof res === 'string') {
        toast(res, 'warn');
      } else {
        setAlertSent(true);
        toast('Alert sent. A nurse has been notified.', 'success');
      }
    } catch (err: any) {
      toast(err?.message || 'Could not send alert.', 'error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(statusUrl)
      .then(() => toast('Link copied!', 'success'))
      .catch(() => toast('Could not copy.', 'error'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F9FB]">
      {/* Minimal header */}
      <header className="bg-white border-b border-[#D6E4EA] px-6 py-3 flex items-center gap-2">
        <Activity className="text-[#0E7C86] w-5 h-5" />
        <span className="font-black text-[#12324A]">OPD Flow</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-sm mx-auto w-full">
        <p className="text-xs font-bold text-[#4A5B6B] uppercase tracking-widest mb-4">Your Token</p>

        {/* Token tile — print-only shows this */}
        <div className={`print-token w-56 h-56 ${getBgClass(patient.priority)} rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-white mb-6`}>
          <div className="text-7xl font-black leading-none">{patient.token}</div>
          <div className="text-lg font-bold opacity-90 mt-2">{patient.priority}</div>
          <div className="text-xs opacity-70 mt-1">{new Date(patient.arrivalTime).toLocaleTimeString()}</div>
        </div>

        {/* QR code — BUG 3 fix */}
        <div className="card p-4 flex flex-col items-center gap-3 w-full mb-4 no-print">
          <QRCode value={statusUrl} size={120} />
          <p className="text-[10px] text-[#4A5B6B] text-center leading-relaxed">
            Data is stored in this browser only. A status link opened on another device will not find this visit.
          </p>
          <div className="flex gap-2 w-full">
            <button onClick={copyLink} className="btn-secondary flex-1 py-2 text-xs gap-1.5">
              <Copy size={13}/> Copy link
            </button>
            <a href={statusUrl} target="_blank" rel="noopener noreferrer"
               className="btn-secondary flex-1 py-2 text-xs gap-1.5 flex items-center justify-center">
              <ExternalLink size={13}/> Open
            </a>
          </div>
        </div>

        {/* Status message */}
        {patient.status === 'called' ? (
          <div className="w-full bg-[#E8F4F8] border border-[#0E7C86]/30 text-[#12324A] p-6 rounded-2xl text-center">
            <CheckCircle className="mx-auto text-[#0E7C86] mb-3" size={40} />
            <h2 className="text-xl font-bold mb-2">Please proceed to the doctor</h2>
            <p className="text-sm font-medium text-[#4A5B6B]">The doctor is ready to see you.</p>
          </div>
        ) : alertSent ? (
          <div className="w-full bg-[#FBEFD6] border border-[#B7740A]/30 text-[#12324A] p-6 rounded-2xl text-center">
            <CheckCircle className="mx-auto text-[#B7740A] mb-3" size={40} />
            <h2 className="text-xl font-bold mb-2">Alert Sent</h2>
            <p className="text-sm font-medium text-[#4A5B6B]">A nurse has been notified and will check on you shortly.</p>
          </div>
        ) : (
          <button
            onClick={handleWorse}
            className="w-full py-5 bg-white border-2 border-[#C62F2F]/40 text-[#C62F2F] rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-2 hover:bg-[#FCE6E3] active:scale-[0.98] transition-all no-print"
          >
            <AlertTriangle size={28} />
            I'm feeling worse
          </button>
        )}

        {patient.flags?.includes('self-reported, verify at desk') && (
          <div className="mt-4 text-xs font-medium text-[#4A5B6B] text-center bg-[#FBEFD6] px-4 py-2 rounded-xl border border-[#B7740A]/20">
            Self-registered — please verify at the desk when called.
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-[#D6E4EA] text-center py-3 text-xs text-[#4A5B6B] font-medium no-print">
        Advisory decision support. Not a diagnosis. Sample data.
      </footer>
    </div>
  );
}
