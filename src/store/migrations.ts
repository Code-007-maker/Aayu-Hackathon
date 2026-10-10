/**
 * Storage schema migrations.
 * 
 * Root causes of BUG 1 (/dashboard blank screen):
 * 1. Old localStorage data from v0.1 lacks new fields: flags, urgencyScore,
 *    status, patientMobile, patientUserId — these cause crashes in the render
 *    path when .map() etc. access undefined properties.
 * 2. The store's `patients` array is loaded from localStorage as-is with no
 *    schema validation, so missing fields propagate to the React render tree.
 * 
 * This module runs once at app start (imported in main.tsx) and patches every
 * stored object to match the current schema before any component renders.
 */

export const STORE_SCHEMA_VERSION = 3;
export const AUTH_SCHEMA_VERSION = 2;

function safeJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function migratePatient(p: any): any {
  return {
    token: p.token ?? 0,
    status: p.status ?? (p.left ? 'left' : p.calledByDoctor ? 'called' : 'waiting'),
    inputs: {
      name: p.inputs?.name ?? '',
      ageYears: p.inputs?.ageYears ?? 30,
      sex: p.inputs?.sex ?? 'male',
      pregnant: p.inputs?.pregnant === true ? 'yes'
               : p.inputs?.pregnant === false ? 'no'
               : (p.inputs?.pregnant ?? 'no'),
      symptomTags: p.inputs?.symptomTags ?? [],
      knownConditions: p.inputs?.knownConditions ?? {},
      consciousness: p.inputs?.consciousness ?? 'alert',
      answeredByAttendant: p.inputs?.answeredByAttendant ?? false,
      answers: p.inputs?.answers ?? {},
      vitals: p.inputs?.vitals ?? undefined,
      painScore: p.inputs?.painScore ?? undefined,
      duration: p.inputs?.duration ?? undefined,
    },
    systemSuggestion: {
      priority: p.systemSuggestion?.priority ?? 'Routine',
      reasonLine: p.systemSuggestion?.reasonLine ?? 'Legacy record',
      firedRules: p.systemSuggestion?.firedRules ?? [],
      flags: p.systemSuggestion?.flags ?? [],
      news2: p.systemSuggestion?.news2 ?? undefined,
      rulePackVersion: p.systemSuggestion?.rulePackVersion ?? 'v0.1-demo',
    },
    priority: p.priority ?? p.systemSuggestion?.priority ?? 'Routine',
    urgencyScore: p.urgencyScore ?? 0,
    arrivalTime: p.arrivalTime ?? Date.now(),
    completedAt: p.completedAt ?? undefined,
    overrideReason: p.overrideReason ?? undefined,
    feelingWorseAlert: p.feelingWorseAlert ?? false,
    feelingWorseTime: p.feelingWorseTime ?? undefined,
    patientUserId: p.patientUserId ?? undefined,
    patientMobile: p.patientMobile ?? undefined,
    flags: p.flags ?? [],
  };
}

function migrateAuditEntry(e: any): any {
  return {
    id: e.id ?? crypto.randomUUID(),
    timestamp: e.timestamp ?? Date.now(),
    token: e.token ?? undefined,
    userId: e.userId ?? undefined,
    userName: e.userName ?? undefined,
    role: e.role ?? 'system',
    action: e.action ?? 'UNKNOWN',
    from: e.from ?? undefined,
    to: e.to ?? undefined,
    reason: e.reason ?? undefined,
    systemSuggestion: e.systemSuggestion ?? undefined,
    inputsSnapshot: e.inputsSnapshot ?? undefined,
    rulePackVersion: e.rulePackVersion ?? undefined,
    prevHash: e.prevHash ?? '0000000000000000000000000000000000000000000000000000000000000000',
    hash: e.hash ?? '0000000000000000000000000000000000000000000000000000000000000000',
  };
}

function migrateUser(u: any): any {
  return {
    id: u.id ?? crypto.randomUUID(),
    name: u.name ?? 'Unknown',
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    role: u.role ?? 'clerk',
    passwordHash: u.passwordHash ?? '',
    salt: u.salt ?? '',
    active: u.active ?? true,
    mustChangePassword: u.mustChangePassword ?? false,
    createdAt: u.createdAt ?? Date.now(),
    createdBy: u.createdBy ?? 'system',
    lastLogin: u.lastLogin ?? undefined,
    // Patient extras
    dependents: u.dependents ?? [],
    ageYears: u.ageYears ?? undefined,
    sex: u.sex ?? undefined,
  };
}

export function runMigrations(): void {
  // ── Migrate store ────────────────────────────
  const storedVersion = parseInt(localStorage.getItem('opd_store_version') || '0', 10);
  if (storedVersion < STORE_SCHEMA_VERSION) {
    const store = safeJSON<any>('opd_store', null);
    if (store) {
      const migrated = {
        ...store,
        patients: Array.isArray(store.patients) ? store.patients.map(migratePatient) : [],
        nextToken: store.nextToken ?? 1,
        settings: {
          demoSpeed: store.settings?.demoSpeed ?? 1,
          routineAgeMins: store.settings?.routineAgeMins ?? 90,
          soonAgeMins: store.settings?.soonAgeMins ?? 30,
          cooldownMins: store.settings?.cooldownMins ?? 30,
          publicBaseUrl: store.settings?.publicBaseUrl ?? '',
        },
        rateLimits: store.rateLimits ?? {},
      };
      try {
        localStorage.setItem('opd_store', JSON.stringify(migrated));
      } catch (e) { console.error('[migration] could not write opd_store', e); }
    }
    localStorage.setItem('opd_store_version', String(STORE_SCHEMA_VERSION));
  }

  // ── Migrate audit log ────────────────────────
  const auditRaw = safeJSON<any[]>('opd_audit_log', []);
  if (Array.isArray(auditRaw) && auditRaw.length > 0) {
    const migrated = auditRaw.map(migrateAuditEntry);
    try {
      localStorage.setItem('opd_audit_log', JSON.stringify(migrated));
    } catch (e) { console.error('[migration] could not write opd_audit_log', e); }
  }

  // ── Migrate auth ─────────────────────────────
  const authVersion = parseInt(localStorage.getItem('opd_auth_version') || '0', 10);
  if (authVersion < AUTH_SCHEMA_VERSION) {
    const auth = safeJSON<any>('opd_auth', null);
    if (auth) {
      const migrated = {
        ...auth,
        users: Array.isArray(auth.users) ? auth.users.map(migrateUser) : [],
        failedAttempts: auth.failedAttempts ?? {},
        currentUser: auth.currentUser ? migrateUser(auth.currentUser) : null,
      };
      try {
        localStorage.setItem('opd_auth', JSON.stringify(migrated));
      } catch (e) { console.error('[migration] could not write opd_auth', e); }
    }
    localStorage.setItem('opd_auth_version', String(AUTH_SCHEMA_VERSION));
  }
}
