import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { useAuth } from '../store/auth';
import { useToast } from '../components/Toast';
import { TAGS_DICT, matchLexicon } from '../engine/lexicon';
import { evaluateTriage, PatientInputs } from '../engine/engine';
import { QRCode } from '../components/QRCode';
import {
  AlertTriangle, CheckCircle, HeartPulse, Loader2,
  Search, ChevronDown, ChevronUp, Copy, ExternalLink, Link as LinkIcon
} from 'lucide-react';

const COMMON_TAGS = [
  'fever', 'cough', 'headache', 'abdominal_pain', 'vomiting', 'diarrhoea',
  'chest_pain', 'breathless', 'dizziness', 'joint_pain', 'back_pain', 'skin_rash',
  'fainting', 'heavy_bleeding', 'confusion', 'seizure', 'med_refill', 'followup',
];

function buildStatusUrl(token: number, baseUrl: string): string {
  const base = (baseUrl || window.location.origin).replace(/\/$/, '');
  return `${base}/status/${token}`;
}

export default function MyVisit() {
  const { currentUser } = useAuth();
  const { patients, createSelfVisit, feelingWorse, settings } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [symptomSearch, setSymptomSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [consciousness, setConsciousness] = useState<'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive'>('alert');
  const [pregnant, setPregnant] = useState<'no' | 'yes' | 'possible'>('no');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [painScore, setPainScore] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const me = currentUser!;

  // Find active visit for this user
  const activeVisit = patients.find(
    p => p.patientUserId === me.id && (p.status === 'waiting' || p.status === 'called')
  );

  const statusUrl = activeVisit ? buildStatusUrl(activeVisit.token, settings.publicBaseUrl) : '';

  // Symptom search filter
  const allTags = Object.entries(TAGS_DICT);
  const filtered = symptomSearch
    ? allTags.filter(([k, v]) =>
        k.includes(symptomSearch.toLowerCase()) ||
        v.en.toLowerCase().includes(symptomSearch.toLowerCase()) ||
        v.hi.includes(symptomSearch)
      )
    : allTags;

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleAns = (k: string) => setAnswers(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (tags.length === 0 && !otherText.trim()) errs.tags = 'Please select at least one symptom.';
    setErrors(errs);
    if (Object.keys(errs).length) { toast('Please select at least one symptom', 'warn'); return; }

    setLoading(true);
    try {
      const age = me.ageYears ?? 30;
      const sex = (me.sex ?? 'other') as 'male' | 'female' | 'other';
      const finalTags = [...tags];
      if (otherText.trim()) finalTags.push('other');

      const inputs: PatientInputs = {
        name: me.name,
        ageYears: age,
        sex,
        pregnant: sex === 'female' && age >= 10 && age <= 60 ? pregnant : 'no',
        symptomTags: finalTags,
        knownConditions: {},
        consciousness,
        answeredByAttendant: false,
        answers,
        painScore: painScore > 0 ? painScore : undefined,
      };

      const res = await createSelfVisit(me, inputs);

      if (typeof res === 'number') {
        toast(`Token #${res} assigned! Priority: ${evaluateTriage(inputs).priority}`, 'success');
        setTags([]);
        setOtherText('');
        setAnswers({});
        setPainScore(0);
        setConsciousness('alert');
      } else if (typeof res === 'string' && res.startsWith('ALREADY_ACTIVE:')) {
        const token = res.split(':')[1];
        toast(`You already have an active visit: Token #${token}`, 'warn');
      } else {
        toast(res as string, 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error. Please try again or see the desk.';
      toast(msg, 'error');
      console.error('[MyVisit submit]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWorse = () => {
    if (!activeVisit) return;
    try {
      const res = feelingWorse(activeVisit.token, me.id);
      if (typeof res === 'string') toast(res, 'warn');
      else toast('Alert sent. A nurse will check on you shortly.', 'success');
    } catch (err: any) {
      toast(err?.message || 'Could not send alert.', 'error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(statusUrl).then(
      () => toast('Link copied!', 'success'),
      () => toast('Could not copy link.', 'error')
    );
  };

  const getPriorityClasses = (p: string) => {
    if (p === 'Immediate') return 'bg-[#C62F2F] text-white';
    if (p === 'Soon') return 'bg-[#B7740A] text-white';
    return 'bg-[#23764E] text-white';
  };

  /* ── ACTIVE VISIT VIEW ─────────────────────── */
  if (activeVisit) {
    return (
      <div className="flex flex-col items-center min-h-[calc(100vh-130px)] p-6 max-w-sm mx-auto pt-10">
        <h1 className="text-2xl font-black text-[#12324A] mb-6">Your Visit</h1>

        {/* Token tile */}
        <div className={`w-56 h-56 ${getPriorityClasses(activeVisit.priority)} rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center mb-6`}>
          <div className="text-7xl font-black leading-none">{activeVisit.token}</div>
          <div className="text-lg font-bold opacity-90 mt-2">{activeVisit.priority}</div>
        </div>

        {/* QR code */}
        <div className="card p-5 flex flex-col items-center gap-3 w-full mb-4">
          <div className="text-xs font-bold text-[#4A5B6B] uppercase tracking-wide">Status QR Code</div>
          <QRCode value={statusUrl} size={120} />
          <p className="text-[10px] text-[#4A5B6B] text-center leading-relaxed">
            Scan to check status. Data is stored in this browser only — a link opened on another device will not find this visit.
          </p>
          <div className="flex gap-2 w-full">
            <button onClick={copyLink} className="btn-secondary flex-1 text-xs py-2 gap-1.5">
              <Copy size={13}/> Copy link
            </button>
            <a href={statusUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-xs py-2 gap-1.5 text-center flex items-center justify-center">
              <ExternalLink size={13}/> Open
            </a>
          </div>
        </div>

        {/* Called state */}
        {activeVisit.status === 'called' ? (
          <div className="w-full bg-[#E8F4F8] border border-[#0E7C86]/30 rounded-2xl p-6 text-center">
            <CheckCircle className="mx-auto text-[#0E7C86] mb-3" size={40} />
            <h2 className="text-xl font-bold text-[#12324A]">Please proceed to the doctor</h2>
          </div>
        ) : (
          <button
            onClick={handleWorse}
            className="w-full py-5 bg-white border-2 border-[#C62F2F]/40 text-[#C62F2F] rounded-2xl font-bold text-lg shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-[#FCE6E3] active:scale-[0.98] transition-all"
          >
            <AlertTriangle size={28} />
            I'm feeling worse
          </button>
        )}
      </div>
    );
  }

  /* ── SELF CHECK-IN FORM ────────────────────── */
  const showPregnancy = (me.sex ?? 'other') === 'female' && (me.ageYears ?? 30) >= 10 && (me.ageYears ?? 30) <= 60;
  const hasChestPain = tags.includes('chest_pain');
  const hasBreathless = tags.includes('breathless');
  const hasFever = tags.includes('fever');

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <HeartPulse className="text-[#0E7C86] w-7 h-7" />
          <h1 className="text-2xl font-black text-[#12324A]">Self Check-In</h1>
        </div>
        <p className="text-sm font-medium text-[#4A5B6B] mb-6">
          Welcome, {me.name} (Age {me.ageYears ?? '?'}, {me.sex ?? 'unknown'}). Select your symptoms below.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Symptom grid */}
          <div>
            <label className="block text-sm font-bold text-[#12324A] mb-2">Symptoms *</label>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5B6B]" />
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Search symptoms…"
                value={symptomSearch}
                onChange={e => setSymptomSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1 mb-2">
              {filtered.map(([key, val]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggleTag(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col ${
                    tags.includes(key)
                      ? 'bg-[#E8F4F8] border-[#0E7C86] ring-2 ring-[#0E7C86]/40'
                      : 'bg-white border-[#D6E4EA] hover:border-[#0E7C86]/50'
                  }`}
                >
                  <span className={`font-bold text-sm leading-tight ${tags.includes(key) ? 'text-[#0E7C86]' : 'text-[#12324A]'}`}>
                    {val.en}
                  </span>
                  <span className="text-[10px] font-medium text-[#4A5B6B] mt-0.5">{val.hi}</span>
                </button>
              ))}
            </div>
            {errors.tags && (
              <div className="flex items-center gap-1.5 text-[#C62F2F] text-xs font-semibold mt-1">
                <AlertTriangle size={12} />{errors.tags}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-[#12324A] mb-1.5">Other symptoms (type here)</label>
            <input type="text" className="input-field" value={otherText} onChange={e => setOtherText(e.target.value)} placeholder="Describe any other symptoms…" />
          </div>

          {/* Adaptive follow-ups */}
          {hasChestPain && (
            <div className="bg-[#FCE6E3] border border-[#C62F2F]/30 rounded-xl p-4">
              <div className="font-bold text-[#C62F2F] text-sm mb-2">Chest Pain Questions</div>
              <div className="flex flex-wrap gap-2">
                {[{k:'cp_over_20',l:'Lasts >20 min?'},{k:'cp_spreads',l:'Spreads to arm/jaw?'},{k:'cp_exertion',l:'On exertion?'},{k:'cp_rest_fainting',l:'Breathless/faint?'}].map(a=>(
                  <button type="button" key={a.k} onClick={()=>toggleAns(a.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${answers[a.k] ? 'bg-[#C62F2F] text-white border-[#C62F2F]' : 'bg-white text-[#C62F2F] border-[#C62F2F]/40 hover:bg-[#FCE6E3]'}`}>{a.l}</button>
                ))}
              </div>
            </div>
          )}
          {hasBreathless && (
            <div className="bg-[#E8F4F8] border border-[#0E7C86]/30 rounded-xl p-4">
              <div className="font-bold text-[#0E7C86] text-sm mb-2">Breathlessness Questions</div>
              <div className="flex flex-wrap gap-2">
                {[{k:'breathless_rest',l:'At rest?'},{k:'breathless_speak',l:'Cannot speak full sentences?'},{k:'breathless_wheeze',l:'Wheezing?'}].map(a=>(
                  <button type="button" key={a.k} onClick={()=>toggleAns(a.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${answers[a.k] ? 'bg-[#0E7C86] text-white border-[#0E7C86]' : 'bg-white text-[#0E7C86] border-[#0E7C86]/40 hover:bg-[#E8F4F8]'}`}>{a.l}</button>
                ))}
              </div>
            </div>
          )}
          {hasFever && (
            <div className="bg-[#FBEFD6] border border-[#B7740A]/30 rounded-xl p-4">
              <div className="font-bold text-[#B7740A] text-sm mb-2">Fever Questions</div>
              <div className="flex flex-wrap gap-2">
                {[{k:'fever_5d',l:'≥5 days?'},{k:'fever_chills',l:'Chills/Rigors?'}].map(a=>(
                  <button type="button" key={a.k} onClick={()=>toggleAns(a.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${answers[a.k] ? 'bg-[#B7740A] text-white border-[#B7740A]' : 'bg-white text-[#B7740A] border-[#B7740A]/40 hover:bg-[#FBEFD6]'}`}>{a.l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Pregnancy */}
          {showPregnancy && (
            <div>
              <label className="block text-sm font-bold text-[#12324A] mb-2">Pregnancy Status</label>
              <div className="flex gap-2">
                {(['no','yes','possible'] as const).map(v=>(
                  <button type="button" key={v} onClick={()=>setPregnant(v)} className={`flex-1 py-2 rounded-xl font-bold text-sm border capitalize transition-all ${pregnant===v?'bg-pink-100 text-pink-900 border-pink-400':'bg-white text-[#4A5B6B] border-[#D6E4EA] hover:border-pink-300'}`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Consciousness */}
          <div>
            <label className="block text-sm font-bold text-[#12324A] mb-2">How are you feeling?</label>
            <div className="flex flex-wrap gap-2">
              {(['alert','confused','voice','pain','unresponsive'] as const).map(c=>(
                <button type="button" key={c} onClick={()=>setConsciousness(c)} className={`px-3 py-2 rounded-xl text-sm font-bold capitalize border transition-all ${consciousness===c?'bg-[#0E7C86] text-white border-[#0E7C86]':'bg-white text-[#4A5B6B] border-[#D6E4EA] hover:border-[#0E7C86]/50'}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* More details toggle */}
          <div>
            <button type="button" onClick={() => setShowMore(!showMore)} className="flex items-center gap-2 text-sm font-bold text-[#4A5B6B] hover:text-[#12324A]">
              {showMore ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              {showMore ? 'Hide' : 'Show'} additional details (pain score)
            </button>
            {showMore && (
              <div className="mt-3 p-4 bg-[#F4F9FB] rounded-xl border border-[#D6E4EA]">
                <label className="block text-sm font-bold text-[#12324A] mb-2">Pain Score: {painScore}/10</label>
                <input type="range" min="0" max="10" value={painScore} onChange={e=>setPainScore(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-base"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Getting token…</> : 'Get Token Number'}
          </button>
        </form>
      </div>
    </div>
  );
}
