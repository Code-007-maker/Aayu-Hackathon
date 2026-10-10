import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { useAuth, can } from '../store/auth';
import { useToast } from '../components/Toast';
import { QRCode } from '../components/QRCode';
import { evaluateTriage, PatientInputs } from '../engine/engine';
import { TAGS_DICT, matchLexicon } from '../engine/lexicon';
import {
  HeartPulse, ShieldCheck, FileEdit, Mic, MicOff, Settings, Search,
  AlertTriangle, Copy, Printer, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';

const COMMON_TAGS = ['fever', 'cough', 'headache', 'abdominal_pain', 'vomiting', 'chest_pain', 'breathless', 'dizziness'];

export default function Desk() {
  const { registerPatient, settings } = useStore();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'quick' | 'detail'>('quick');
  const [symptomSearch, setSymptomSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [consciousness, setConsciousness] = useState<'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive'>('alert');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  
  // Patient Details
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male');
  const [pregnant, setPregnant] = useState<'no' | 'yes' | 'possible'>('no');
  const [attendant, setAttendant] = useState(false);
  
  // Vitals
  const [vitals, setVitals] = useState({
    respiratoryRate: '', spO2: '', systolicBP: '', diastolicBP: '',
    pulse: '', temperature: '', bloodGlucose: ''
  });
  const [painScore, setPainScore] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Voice Input (mocked for demo)
  const [isRecording, setIsRecording] = useState(false);

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleAns = (k: string) => setAnswers(prev => ({ ...prev, [k]: !prev[k] }));

  // Print Token state
  const [printedToken, setPrintedToken] = useState<{ token: number; priority: string; url: string; time: number } | null>(null);

  // Duplicate Override state
  const [duplicateWarning, setDuplicateWarning] = useState<{ active: boolean; token?: number }>({ active: false });
  const [overrideReason, setOverrideReason] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    const age = parseFloat(ageYears);
    if (!ageYears || isNaN(age) || age < 0 || age > 120) e.age = 'Invalid age';
    if (tags.length === 0 && !otherText.trim()) e.tags = 'Select at least one symptom';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const parseVitals = () => {
    const v: any = {};
    if (vitals.respiratoryRate) v.respiratoryRate = parseFloat(vitals.respiratoryRate);
    if (vitals.spO2) v.spO2 = parseFloat(vitals.spO2);
    if (vitals.systolicBP) v.systolicBP = parseFloat(vitals.systolicBP);
    if (vitals.diastolicBP) v.diastolicBP = parseFloat(vitals.diastolicBP);
    if (vitals.pulse) v.pulse = parseFloat(vitals.pulse);
    if (vitals.temperature) v.temperature = parseFloat(vitals.temperature);
    if (vitals.bloodGlucose) v.bloodGlucose = parseFloat(vitals.bloodGlucose);
    return Object.keys(v).length > 0 ? v : undefined;
  };

  const handleRegister = async (e?: React.FormEvent, forceDuplicate = false) => {
    if (e) e.preventDefault();
    if (!validate()) { toast('Please fix the errors', 'warn'); return; }
    if (!currentUser) return;

    setLoading(true);
    try {
      const inputs: PatientInputs = {
        name: name.trim(),
        ageYears: parseFloat(ageYears),
        sex,
        pregnant: sex === 'female' && parseFloat(ageYears) >= 10 && parseFloat(ageYears) <= 60 ? pregnant : 'no',
        symptomTags: otherText.trim() ? [...tags, 'other'] : [...tags],
        knownConditions: {},
        consciousness,
        answeredByAttendant: attendant,
        answers,
        painScore: painScore ? parseInt(painScore, 10) : undefined,
        vitals: parseVitals(),
      };

      const res = registerPatient(inputs, currentUser, {
        mobile: mobile.trim() || undefined,
        isSelfReport: false,
        forceDuplicate,
        overrideReason: overrideReason.trim() || undefined
      });

      if (typeof res === 'number') {
        // Success
        const priority = evaluateTriage(inputs).priority;
        setPrintedToken({
          token: res,
          priority,
          url: `${(settings.publicBaseUrl || window.location.origin).replace(/\/$/, '')}/status/${res}`,
          time: Date.now()
        });
        toast(`Token #${res} created (${priority})`, 'success');
        resetForm();
      } else if (typeof res === 'string' && res.startsWith('DUPLICATE_WARNING:')) {
        setDuplicateWarning({ active: true, token: parseInt(res.split(':')[1]) });
      } else {
        toast(res as string, 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setMobile(''); setAgeYears(''); setSex('male'); setPregnant('no');
    setTags([]); setOtherText(''); setAnswers({}); setConsciousness('alert'); setAttendant(false);
    setVitals({ respiratoryRate: '', spO2: '', systolicBP: '', diastolicBP: '', pulse: '', temperature: '', bloodGlucose: '' });
    setPainScore(''); setErrors({}); setDuplicateWarning({ active: false }); setOverrideReason('');
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    toast('Listening... (simulated)', 'info');
    setTimeout(() => {
      setTags(prev => Array.from(new Set([...prev, 'chest_pain', 'breathless'])));
      setIsRecording(false);
      toast('Mapped to: Chest Pain, Breathlessness', 'success');
    }, 2000);
  };

  const hasChestPain = tags.includes('chest_pain');
  const hasBreathless = tags.includes('breathless');
  const hasFever = tags.includes('fever');
  const showPregnancy = sex === 'female' && parseFloat(ageYears) >= 10 && parseFloat(ageYears) <= 60;

  const allTags = Object.entries(TAGS_DICT);
  const filtered = symptomSearch
    ? allTags.filter(([k, v]) => k.includes(symptomSearch.toLowerCase()) || v.en.toLowerCase().includes(symptomSearch.toLowerCase()) || v.hi.includes(symptomSearch))
    : allTags;

  if (printedToken) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#F4F9FB]">
        <div className="card p-10 flex flex-col items-center max-w-sm w-full print-token">
          <div className="text-sm font-bold text-[#4A5B6B] uppercase tracking-widest mb-2 no-print">Token Printed</div>
          
          <div className="w-full text-center border-b border-[#D6E4EA] pb-4 mb-6">
            <h2 className="text-xl font-black text-[#12324A]">OPD Token</h2>
            <div className="text-xs font-medium text-[#4A5B6B] mt-1">{new Date(printedToken.time).toLocaleString()}</div>
          </div>

          <div className="text-8xl font-black text-[#12324A] leading-none mb-2">{printedToken.token}</div>
          
          <div className={`text-lg font-bold px-6 py-2 rounded-xl mb-8 border-2 ${
            printedToken.priority === 'Immediate' ? 'bg-[#FCE6E3] text-[#C62F2F] border-[#C62F2F]' :
            printedToken.priority === 'Soon' ? 'bg-[#FBEFD6] text-[#B7740A] border-[#B7740A]' :
            'bg-[#E0F2E8] text-[#23764E] border-[#23764E]'
          }`}>
            {printedToken.priority}
          </div>

          <QRCode value={printedToken.url} size={140} />
          <div className="mt-4 text-[10px] text-[#4A5B6B] text-center max-w-[200px] leading-relaxed">
            Scan to check status on your phone. Wait in the designated area.
          </div>

          <div className="mt-8 w-full flex gap-3 no-print">
            <button onClick={() => window.print()} className="btn-secondary flex-1 py-3"><Printer size={16}/> Print</button>
            <button onClick={() => setPrintedToken(null)} className="btn-primary flex-1 py-3">Next Patient</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* ── Duplicate Override Modal ── */}
      {duplicateWarning.active && (
        <div className="fixed inset-0 bg-[#12324A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full shadow-2xl animate-slide-in">
            <div className="flex items-center gap-3 mb-4 text-[#B7740A]">
              <div className="p-3 bg-[#FBEFD6] rounded-xl"><AlertTriangle size={24}/></div>
              <h2 className="text-xl font-black">Duplicate Detected</h2>
            </div>
            <p className="text-[#4A5B6B] text-sm font-medium leading-relaxed mb-6">
              A patient with these details is already active (Token #{duplicateWarning.token}). Registering again may skew data.
            </p>
            
            {(currentUser?.role === 'admin' || currentUser?.role === 'nurse') ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-1.5">Override Reason (Required)</label>
                  <input type="text" className="input-field" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="e.g. Return visit for new symptom" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDuplicateWarning({ active: false })} className="btn-secondary px-4">Cancel</button>
                  <button onClick={() => handleRegister(undefined, true)} disabled={!overrideReason.trim()} className="btn-danger px-4">Force Register</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-[#FCE6E3] text-[#C62F2F] rounded-lg font-bold border border-[#C62F2F]/30">
                  Only Nurses and Admins can override duplicate warnings.
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setDuplicateWarning({ active: false })} className="btn-secondary px-4">Cancel Registration</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEFT: Form ── */}
      <div className="flex-1 space-y-6">
        <div className="card p-6 md:p-8 border-t-4 border-t-[#0E7C86]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-black text-[#12324A]">Registration Desk</h1>
              <p className="text-sm font-medium text-[#4A5B6B] mt-1">Walk-in patient triage and token generation</p>
            </div>
            <div className="flex bg-[#F4F9FB] rounded-xl p-1 border border-[#D6E4EA]">
              <button onClick={() => setMode('quick')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === 'quick' ? 'bg-white shadow-sm text-[#0E7C86]' : 'text-[#4A5B6B] hover:text-[#12324A]'}`}>Quick</button>
              <button onClick={() => setMode('detail')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === 'detail' ? 'bg-white shadow-sm text-[#0E7C86]' : 'text-[#4A5B6B] hover:text-[#12324A]'}`}>Detailed</button>
            </div>
          </div>

          <form onSubmit={e => handleRegister(e)} noValidate className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Patient Name *</label>
                <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" disabled={loading} />
                {errors.name && <div className="text-[#C62F2F] text-xs font-bold mt-1">{errors.name}</div>}
              </div>
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Mobile Number</label>
                <input type="tel" className="input-field" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="For duplicate checks" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Age (Years) *</label>
                <input type="number" step="0.1" className="input-field" value={ageYears} onChange={e => setAgeYears(e.target.value)} placeholder="e.g. 45" disabled={loading} />
                {errors.age && <div className="text-[#C62F2F] text-xs font-bold mt-1">{errors.age}</div>}
              </div>
              <div>
                <label className="block text-sm font-bold text-[#12324A] mb-1.5">Sex *</label>
                <select className="input-field" value={sex} onChange={e => setSex(e.target.value as any)} disabled={loading}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {showPregnancy && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <label className="block text-sm font-bold text-pink-900 mb-2">Pregnancy Status</label>
                <div className="flex gap-2">
                  {(['no','yes','possible'] as const).map(v => (
                    <button type="button" key={v} onClick={() => setPregnant(v)} className={`flex-1 py-2 rounded-lg font-bold text-sm border capitalize transition-all ${pregnant === v ? 'bg-pink-200 text-pink-900 border-pink-400' : 'bg-white text-[#4A5B6B] border-[#D6E4EA] hover:border-pink-300'}`}>{v}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-[#12324A]">Symptoms *</label>
                <button type="button" onClick={handleVoice} className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-colors ${isRecording ? 'bg-[#FCE6E3] text-[#C62F2F] border-[#C62F2F]' : 'bg-[#E8F4F8] text-[#0E7C86] border-[#0E7C86]/30 hover:bg-[#D4EBEF]'}`}>
                  {isRecording ? <MicOff size={14}/> : <Mic size={14}/>} Voice Input
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5B6B]" />
                <input type="text" className="input-field pl-9 py-2" placeholder="Search symptoms…" value={symptomSearch} onChange={e => setSymptomSearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {filtered.map(([key, val]) => (
                  <button type="button" key={key} onClick={() => toggleTag(key)} className={`p-2 rounded-lg border text-left transition-all ${tags.includes(key) ? 'bg-[#E8F4F8] border-[#0E7C86] ring-1 ring-[#0E7C86]/50' : 'bg-white border-[#D6E4EA] hover:border-[#0E7C86]/50'}`}>
                    <div className={`font-bold text-[11px] leading-tight ${tags.includes(key) ? 'text-[#0E7C86]' : 'text-[#12324A]'}`}>{val.en}</div>
                    <div className="text-[9px] font-medium text-[#4A5B6B] mt-0.5 truncate">{val.hi}</div>
                  </button>
                ))}
              </div>
              {errors.tags && <div className="text-[#C62F2F] text-xs font-bold mt-1.5">{errors.tags}</div>}
              <input type="text" className="input-field mt-3 py-2 text-sm" value={otherText} onChange={e => setOtherText(e.target.value)} placeholder="Other symptoms / free text note" />
            </div>

            {hasChestPain && (
              <div className="bg-[#FCE6E3] border border-[#C62F2F]/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="font-bold text-[#C62F2F] text-sm">Chest Pain Assessment</div>
                <div className="flex flex-wrap gap-2">
                  {[{k:'cp_over_20',l:'Lasts >20 min?'},{k:'cp_spreads',l:'Spreads to arm/jaw?'},{k:'cp_exertion',l:'On exertion?'},{k:'cp_rest_fainting',l:'Breathless/faint?'}].map(a=>(
                    <button type="button" key={a.k} onClick={()=>toggleAns(a.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${answers[a.k] ? 'bg-[#C62F2F] text-white border-[#C62F2F]' : 'bg-white text-[#C62F2F] border-[#C62F2F]/40 hover:bg-[#FCE6E3]'}`}>{a.l}</button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'detail' && (
              <div className="border-t border-[#D6E4EA] pt-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-2">Consciousness / AVPU</label>
                  <div className="flex flex-wrap gap-2">
                    {(['alert','confused','voice','pain','unresponsive'] as const).map(c=>(
                      <button type="button" key={c} onClick={()=>setConsciousness(c)} className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize border transition-all ${consciousness===c?'bg-[#0E7C86] text-white border-[#0E7C86]':'bg-white text-[#4A5B6B] border-[#D6E4EA] hover:bg-[#F4F9FB]'}`}>{c}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-3 text-sm font-bold text-[#12324A] cursor-pointer w-fit">
                    <input type="checkbox" checked={attendant} onChange={e => setAttendant(e.target.checked)} className="rounded text-[#0E7C86] focus:ring-[#0E7C86] border-[#D6E4EA]" />
                    Answers provided by attendant
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#12324A] mb-3">Vitals (Optional at Desk)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Heart Rate (bpm)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 75" value={vitals.pulse} onChange={e => setVitals({...vitals, pulse: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">SpO2 (%)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 98" value={vitals.spO2} onChange={e => setVitals({...vitals, spO2: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Resp. Rate (/min)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 16" value={vitals.respiratoryRate} onChange={e => setVitals({...vitals, respiratoryRate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Temp (°C)</label>
                      <input type="number" step="0.1" className="input-field py-2 px-3 text-sm" placeholder="e.g. 37.0" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Sys BP (mmHg)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 120" value={vitals.systolicBP} onChange={e => setVitals({...vitals, systolicBP: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Dia BP (mmHg)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 80" value={vitals.diastolicBP} onChange={e => setVitals({...vitals, diastolicBP: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Blood Glu (mg/dL)</label>
                      <input type="number" className="input-field py-2 px-3 text-sm" placeholder="e.g. 100" value={vitals.bloodGlucose} onChange={e => setVitals({...vitals, bloodGlucose: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A5B6B] mb-1">Pain (0-10)</label>
                      <input type="number" min="0" max="10" className="input-field py-2 px-3 text-sm" placeholder="e.g. 4" value={painScore} onChange={e => setPainScore(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base shadow-sm">
              {loading ? 'Processing...' : 'Assign Priority & Get Token'}
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Guidelines ── */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-4 hidden md:block">
        <div className="card p-5 bg-[#E8F4F8] border-[#0E7C86]/30">
          <h3 className="font-bold text-[#0E7C86] flex items-center gap-2 mb-2"><ShieldCheck size={18}/> Protocol Guidelines</h3>
          <ul className="text-xs text-[#12324A] font-medium space-y-2 leading-relaxed">
            <li>• Always ask for exact age for patients under 16 or over 65.</li>
            <li>• If a patient is uncommunicative, switch to <strong>Detailed Mode</strong> and tick "Answers provided by attendant".</li>
            <li>• You can use voice input to rapidly tag symptoms from dictation.</li>
            <li>• Red borders indicate a triggered adaptive follow-up.</li>
          </ul>
        </div>
        <div className="card p-5 bg-[#FBEFD6] border-[#B7740A]/30">
          <h3 className="font-bold text-[#B7740A] flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Duplicate Policy</h3>
          <ul className="text-xs text-[#12324A] font-medium space-y-2 leading-relaxed">
            <li>• Mobile numbers and Name+Age are cross-checked against active visits.</li>
            <li>• If a duplicate is flagged, only Nurses or Admins can override it with a logged reason.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
