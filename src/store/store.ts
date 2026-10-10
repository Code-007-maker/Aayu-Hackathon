import { create } from 'zustand';
import { PatientInputs, TriageResult, evaluateTriage, Priority, calculateUrgencyScore } from '../engine/engine';
import { addAuditEntry } from './audit';
import { User } from './auth';

export type VisitStatus = 'waiting' | 'called' | 'completed' | 'left' | 'cancelled';

export interface Patient {
  token: number;
  status: VisitStatus;
  inputs: PatientInputs;
  systemSuggestion: TriageResult;
  priority: Priority;
  urgencyScore: number;
  arrivalTime: number;
  completedAt?: number;
  overrideReason?: string;
  feelingWorseAlert: boolean;
  feelingWorseTime?: number;
  patientUserId?: string;
  patientMobile?: string;
  flags: string[]; // Extra flags like 'self-reported, verify at desk', 'duplicate-override'
}

export interface Settings {
  demoSpeed: number;
  routineAgeMins: number;
  soonAgeMins: number;
  cooldownMins: number;
  publicBaseUrl: string;
}

interface StoreState {
  patients: Patient[];
  nextToken: number;
  settings: Settings;
  rateLimits: Record<string, number[]>;
  
  checkDuplicate: (inputs: PatientInputs, mobile?: string) => { isDuplicate: boolean; visit?: Patient; reason?: string };
  registerPatient: (inputs: PatientInputs, actor: User, options?: { mobile?: string; isSelfReport?: boolean; forceDuplicate?: boolean; overrideReason?: string }) => number | string;
  createSelfVisit: (actor: User, inputs: PatientInputs) => Promise<number | string>;
  updateVitals: (token: number, vitals: any, actor: User) => void;
  overridePriority: (token: number, newPriority: Priority, reason: string, actor: User) => void;
  feelingWorse: (token: number, actorId?: string) => string | true;
  markStatus: (token: number, status: VisitStatus, actor: User) => void;
  seedDemoPatients: (actor: User) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  replaceState: (state: Partial<StoreState>) => void;
  promoteAgedPatients: () => void;
}

const loadState = () => {
  try {
    const s = localStorage.getItem('opd_store');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return null;
};

const initialState = loadState() || {
  patients: [],
  nextToken: 1,
  settings: { demoSpeed: 1, routineAgeMins: 90, soonAgeMins: 30, cooldownMins: 30, publicBaseUrl: '' },
  rateLimits: {},
};
// Ensure settings always has publicBaseUrl (migration guard)
if (!initialState.settings) initialState.settings = {} as any;
if (initialState.settings.publicBaseUrl === undefined) initialState.settings.publicBaseUrl = '';
if (!initialState.rateLimits) initialState.rateLimits = {};

const bc = new BroadcastChannel('opd_store_sync');

export const useStore = create<StoreState>((set, get) => {
  const saveAndSync = (newState: any) => {
    set(newState);
    const stateToSave = {
      patients: get().patients,
      nextToken: get().nextToken,
      settings: get().settings,
      rateLimits: get().rateLimits,
    };
    try { localStorage.setItem('opd_store', JSON.stringify(stateToSave)); } catch (e) { console.error('[store] save failed', e); }
    try { bc.postMessage(stateToSave); } catch {}
  };

  const getUrgency = (p: Patient) => {
    const waitMins = Math.floor((Date.now() - p.arrivalTime) / 60000 * get().settings.demoSpeed);
    return calculateUrgencyScore(p.priority, p.systemSuggestion.news2 || 0, p.inputs.ageYears, p.inputs.knownConditions, p.inputs.painScore || 0, waitMins, p.systemSuggestion.flags);
  };

  return {
    ...initialState,

    replaceState: (state) => {
      set(state);
      localStorage.setItem('opd_store', JSON.stringify({
        patients: get().patients,
        nextToken: get().nextToken,
        settings: get().settings,
        rateLimits: get().rateLimits,
      }));
    },

    checkDuplicate: (inputs, mobile) => {
      const { patients } = get();
      const activeVisits = patients.filter(p => p.status === 'waiting' || p.status === 'called');
      
      let duplicate = activeVisits.find(p => p.patientMobile && mobile && p.patientMobile === mobile);
      if (duplicate) return { isDuplicate: true, visit: duplicate, reason: 'Same mobile number' };

      const iname = (inputs.name || '').toLowerCase().replace(/\s/g, '');
      if (iname) {
        duplicate = activeVisits.find(p => {
          if (!p.inputs.name) return false;
          const pname = p.inputs.name.toLowerCase().replace(/\s/g, '');
          const ageDiff = Math.abs(p.inputs.ageYears - inputs.ageYears);
          return pname === iname && p.inputs.sex === inputs.sex && ageDiff <= 1;
        });
        if (duplicate) return { isDuplicate: true, visit: duplicate, reason: 'Same name, sex, and similar age' };
      }
      return { isDuplicate: false };
    },

    registerPatient: (inputs, actor, options = {}) => {
      const { patients, rateLimits, nextToken, settings, checkDuplicate } = get();
      const now = Date.now();

      // Rate limit check for self-registration
      if (options.isSelfReport) {
        const limits = rateLimits[actor.id] || [];
        const recent = limits.filter(t => now - t < 3600000);
        if (recent.length >= 3) {
          addAuditEntry({ timestamp: now, userId: actor.id, userName: actor.name, role: actor.role, action: 'RATE_LIMIT_BLOCKED' });
          return 'Rate limit exceeded: Max 3 attempts per hour.';
        }
        recent.push(now);
        set({ rateLimits: { ...rateLimits, [actor.id]: recent } });
      }

      // 30 min cooldown check on completed visits
      if (options.isSelfReport) {
        const myPast = patients.filter(p => p.patientUserId === actor.id && (p.status === 'completed' || p.status === 'left'));
        myPast.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        if (myPast.length > 0 && myPast[0].completedAt) {
          const minsSince = (now - myPast[0].completedAt) / 60000;
          if (minsSince < settings.cooldownMins) {
            return `You recently completed a visit. Please wait ${Math.ceil(settings.cooldownMins - minsSince)} minutes or see the desk.`;
          }
        }
      }

      // Check duplicates
      const dupCheck = checkDuplicate(inputs, options.mobile);
      if (dupCheck.isDuplicate) {
        if (!options.forceDuplicate) {
          return `DUPLICATE_WARNING:${dupCheck.visit?.token}`;
        }
        if (options.forceDuplicate && !['nurse', 'admin'].includes(actor.role)) {
          return 'Only a nurse or admin can override a duplicate warning.';
        }
      }

      const token = nextToken;
      const result = evaluateTriage(inputs);
      const flags = [];
      if (options.isSelfReport) flags.push('self-reported, verify at desk');
      if (options.forceDuplicate) flags.push('duplicate-override');

      const newPatient: Patient = {
        token,
        status: 'waiting',
        inputs,
        systemSuggestion: result,
        priority: result.priority,
        urgencyScore: 0,
        arrivalTime: now,
        feelingWorseAlert: false,
        patientUserId: options.isSelfReport ? actor.id : undefined,
        patientMobile: options.mobile,
        flags,
      };
      
      newPatient.urgencyScore = getUrgency(newPatient);

      saveAndSync({ patients: [...patients, newPatient], nextToken: token + 1 });
      
      addAuditEntry({
        timestamp: now,
        token,
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: options.forceDuplicate ? 'REGISTER_DUPLICATE_OVERRIDE' : 'REGISTER',
        to: result.priority,
        reason: options.overrideReason,
        systemSuggestion: result.priority,
        inputsSnapshot: inputs,
        rulePackVersion: result.rulePackVersion,
      });

      return token;
    },

    // BUG 2 fix: dedicated self-registration action for 'patient' role only
    createSelfVisit: async (actor, inputs) => {
      if (actor.role !== 'patient') return 'Self check-in is only for patients.';
      
      const { patients, rateLimits, nextToken, settings } = get();
      const now = Date.now();

      // One active visit check
      const active = patients.find(p => p.patientUserId === actor.id && (p.status === 'waiting' || p.status === 'called'));
      if (active) return `ALREADY_ACTIVE:${active.token}`;

      // Rate limit (max 3/hr)
      const limits = rateLimits[actor.id] ?? [];
      const recent = limits.filter(t => now - t < 3_600_000);
      if (recent.length >= 3) return 'Rate limit: max 3 check-ins per hour. Please see the desk.';
      
      // Cooldown
      const myPast = patients.filter(p => p.patientUserId === actor.id && (p.status === 'completed' || p.status === 'left'));
      myPast.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      if (myPast.length > 0 && myPast[0].completedAt) {
        const minsSince = (now - myPast[0].completedAt) / 60_000;
        if (minsSince < settings.cooldownMins) {
          return `Please wait ${Math.ceil(settings.cooldownMins - minsSince)} more minute(s) before another check-in.`;
        }
      }

      const token = nextToken;
      let result;
      try { result = evaluateTriage(inputs); }
      catch (e) { console.error('[store] triage error', e); return 'Triage engine error. Please see the desk.'; }

      const newPatient: Patient = {
        token,
        status: 'waiting',
        inputs,
        systemSuggestion: result,
        priority: result.priority,
        urgencyScore: 0,
        arrivalTime: now,
        feelingWorseAlert: false,
        patientUserId: actor.id,
        patientMobile: actor.phone,
        flags: ['self-reported, verify at desk'],
      };
      newPatient.urgencyScore = getUrgency(newPatient);
      
      set({ rateLimits: { ...rateLimits, [actor.id]: [...recent, now] } });
      saveAndSync({ patients: [...patients, newPatient], nextToken: token + 1 });

      try {
        await addAuditEntry({ timestamp: now, token, userId: actor.id, userName: actor.name, role: actor.role, action: 'SELF_REGISTER', to: result.priority, rulePackVersion: result.rulePackVersion });
      } catch (e) { console.error('[store] audit error', e); }

      return token;
    },

    updateVitals: (token, vitals, actor) => {
      const { patients } = get();
      const p = patients.find(p => p.token === token);
      if (!p) return;

      const newInputs = { ...p.inputs, vitals };
      const newResult = evaluateTriage(newInputs);
      const newPriority = p.overrideReason ? p.priority : newResult.priority;
      
      const updated = patients.map(pt => {
        if (pt.token === token) {
          const np = { ...pt, inputs: newInputs, systemSuggestion: newResult, priority: newPriority };
          np.urgencyScore = getUrgency(np);
          return np;
        }
        return pt;
      });
      
      saveAndSync({ patients: updated });

      addAuditEntry({
        timestamp: Date.now(),
        token,
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'UPDATE_VITALS',
        from: p.priority,
        to: newPriority,
        systemSuggestion: newResult.priority,
        inputsSnapshot: newInputs,
        rulePackVersion: newResult.rulePackVersion,
      });
    },

    overridePriority: (token, newPriority, reason, actor) => {
      if (!['nurse', 'doctor'].includes(actor.role)) throw new Error('Denied');
      
      const { patients } = get();
      const p = patients.find(p => p.token === token);
      if (!p) return;

      const updated = patients.map(pt => {
        if (pt.token === token) {
          const np = { ...pt, priority: newPriority, overrideReason: reason };
          np.urgencyScore = getUrgency(np);
          return np;
        }
        return pt;
      });
      
      saveAndSync({ patients: updated });

      addAuditEntry({
        timestamp: Date.now(),
        token,
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'OVERRIDE',
        from: p.priority,
        to: newPriority,
        reason,
        rulePackVersion: p.systemSuggestion.rulePackVersion,
      });
    },

    feelingWorse: (token, actorId) => {
      const { patients } = get();
      const p = patients.find(p => p.token === token);
      if (!p) return 'Not found';

      const now = Date.now();
      if (p.feelingWorseTime && (now - p.feelingWorseTime) < 5 * 60 * 1000) {
        return 'Alert already sent recently. Please wait a moment for the nurse.';
      }

      const updated = patients.map(pt => {
        if (pt.token === token) {
          let np = pt.priority;
          if (np === 'Routine') np = 'Soon';
          else if (np === 'Soon') np = 'Immediate';
          const newPt = { ...pt, feelingWorseAlert: true, feelingWorseTime: now, priority: np };
          newPt.urgencyScore = getUrgency(newPt);
          return newPt;
        }
        return pt;
      });

      saveAndSync({ patients: updated });

      addAuditEntry({
        timestamp: now,
        token,
        userId: actorId || p.patientUserId || 'patient',
        role: 'patient',
        action: 'FEELING_WORSE',
        from: p.priority,
        to: updated.find(pt => pt.token === token)?.priority,
        reason: 'Patient self-reported feeling worse',
        rulePackVersion: p.systemSuggestion.rulePackVersion,
      });
      
      return true;
    },

    markStatus: (token, status, actor) => {
      const { patients } = get();
      const p = patients.find(p => p.token === token);
      if (!p) return;
      
      const now = Date.now();
      const updated = patients.map(pt => pt.token === token ? { ...pt, status, completedAt: status === 'completed' || status === 'left' ? now : undefined } : pt);
      saveAndSync({ patients: updated });
      addAuditEntry({ timestamp: now, token, userId: actor.id, userName: actor.name, role: actor.role, action: `MARK_${status.toUpperCase()}` });
    },

    seedDemoPatients: (actor) => {
      const now = Date.now();
      const demoPatients = [
        { t: 87, n: 'Anil', a: 60, s: 'male', tags: ['chest_pain', 'sweating'], wait: 5 },
        { t: 91, n: 'Priya', a: 32, s: 'female', preg: true, tags: ['pregnancy_bleeding'], wait: 2 },
        { t: 76, n: 'Raju', a: 54, s: 'male', tags: ['face_droop', 'slurred_speech'], wait: 12 },
        { t: 64, n: 'Dev', a: 71, s: 'male', tags: ['fever'], cond: { diabetes: true }, wait: 35 },
        { t: 58, n: 'Ajay', a: 45, s: 'male', tags: ['breathless_exertion'], vitals: { spO2: 94 }, wait: 40 },
        { t: 70, n: 'Meena', a: 8, s: 'female', tags: ['fever'], wait: 50 },
        { t: 23, n: 'Sita', a: 26, s: 'female', tags: ['med_refill'], wait: 110 },
      ];

      const newPatients: Patient[] = demoPatients.map(dp => {
        const inputs: PatientInputs = {
          name: dp.n,
          ageYears: dp.a,
          sex: dp.s as any,
          pregnant: (dp.preg ? 'yes' : 'no') as any,
          symptomTags: dp.tags,
          knownConditions: dp.cond || {},
          consciousness: 'alert',
          answeredByAttendant: false,
          answers: {},
          vitals: dp.vitals
        };
        const result = evaluateTriage(inputs);
        const p: Patient = {
          token: dp.t,
          status: 'waiting',
          inputs,
          systemSuggestion: result,
          priority: result.priority,
          urgencyScore: 0,
          arrivalTime: now - dp.wait * 60000,
          feelingWorseAlert: false,
          flags: [],
        };
        p.urgencyScore = getUrgency(p);
        return p;
      });
      
      saveAndSync({ patients: [...get().patients, ...newPatients], nextToken: 100 });
      
      addAuditEntry({
        timestamp: Date.now(),
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: 'SEED_DEMO',
      });
    },

    updateSettings: (settings) => {
      saveAndSync({ settings: { ...get().settings, ...settings } });
    },
    
    promoteAgedPatients: () => {
      const { patients, settings } = get();
      let changed = false;
      const now = Date.now();
      
      const updated = patients.map(p => {
        if (p.status !== 'waiting' || p.priority === 'Immediate') return p;
        
        const waitMins = (now - p.arrivalTime) / 60000 * settings.demoSpeed;
        
        let newP = { ...p };
        if (p.priority === 'Routine' && waitMins >= settings.routineAgeMins) {
          changed = true;
          newP.priority = 'Soon';
        }
        
        const uScore = getUrgency(newP);
        if (uScore !== newP.urgencyScore) {
          newP.urgencyScore = uScore;
          changed = true;
        }
        
        return newP;
      });
      
      if (changed) {
        saveAndSync({ patients: updated });
      }
    }
  };
});

bc.onmessage = (event) => {
  useStore.getState().replaceState(event.data);
};

setInterval(() => {
  useStore.getState().promoteAgedPatients();
}, 5000);
