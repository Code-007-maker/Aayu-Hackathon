import { create } from 'zustand';
import { addAuditEntry } from './audit';

export type Role = 'admin' | 'doctor' | 'nurse' | 'clerk' | 'patient';

/**
 * Permission table — EVERY role has an explicit entry for every permission.
 * Unknown roles get no access (never an exception).
 */
export const PERMISSIONS: Record<Role, Record<string, boolean>> = {
  admin: {
    viewDashboard: true,
    viewDashboardActions: false, // read-only
    registerPatient: true,
    viewAudit: true,
    viewRules: true,
    viewSimulate: true,
    manageUsers: true,
    selfVisit: false,
    overridePriority: false,
  },
  doctor: {
    viewDashboard: true,
    viewDashboardActions: true,
    registerPatient: false,
    viewAudit: true,
    viewRules: true,
    viewSimulate: true,
    manageUsers: false,
    selfVisit: false,
    overridePriority: true,
  },
  nurse: {
    viewDashboard: true,
    viewDashboardActions: true,
    registerPatient: true,
    viewAudit: true,
    viewRules: true,
    viewSimulate: false,
    manageUsers: false,
    selfVisit: false,
    overridePriority: true,
  },
  clerk: {
    viewDashboard: true,
    viewDashboardActions: false, // read-only
    registerPatient: true,
    viewAudit: false,
    viewRules: true,
    viewSimulate: false,
    manageUsers: false,
    selfVisit: false,
    overridePriority: false,
  },
  patient: {
    viewDashboard: false,
    viewDashboardActions: false,
    registerPatient: false,
    viewAudit: false,
    viewRules: false,
    viewSimulate: false,
    manageUsers: false,
    selfVisit: true,
    overridePriority: false,
  },
};

export function can(role: Role | undefined, permission: string): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.[permission] ?? false;
}

export interface Dependent {
  id: string;
  name: string;
  ageYears: number;
  sex: 'male' | 'female' | 'other';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  passwordHash: string;
  salt: string;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: number;
  createdBy: string;
  lastLogin?: number;
  // Patient-specific demographics
  ageYears?: number;
  sex?: 'male' | 'female' | 'other';
  dependents?: Dependent[];
}

export interface AuthState {
  users: User[];
  currentUser: User | null;
  failedAttempts: Record<string, { count: number; lockedUntil: number }>;
  lastActiveTime: number;

  login: (identifier: string, password: string) => Promise<true | string>;
  logout: () => void;
  updateActivity: () => void;
  createUser: (
    params: Omit<User, 'id' | 'passwordHash' | 'salt' | 'createdAt' | 'createdBy'> & { password?: string },
    actor: User
  ) => Promise<User & { _plainPass?: string }>;
  deactivateUser: (userId: string, actor: User) => void;
  reactivateUser: (userId: string, actor: User) => void;
  resetPassword: (userId: string, newPassword: string | undefined, actor?: User) => Promise<string | null>;
  seedAdmin: () => Promise<void>;
  seedDemoStaff: (actor: User) => Promise<any[]>;
  signUpPatient: (
    name: string,
    phone: string,
    password: string,
    ageYears: number,
    sex: 'male' | 'female' | 'other',
    email?: string
  ) => Promise<true | string>;
  addDependent: (dependent: Omit<Dependent, 'id'>) => void;
  replaceState: (state: Partial<AuthState>) => void;
}

// ── PBKDF2-SHA256 ────────────────────────────────────────────────────────────
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateTempPassword(): string {
  return Math.random().toString(36).slice(-6) + 'A1!';
}

// ── Persistence helpers ───────────────────────────────────────────────────────
function loadAuthState(): Partial<AuthState> {
  try {
    const s = localStorage.getItem('opd_auth');
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

const persisted = loadAuthState();

const initial: Pick<AuthState, 'users' | 'currentUser' | 'failedAttempts' | 'lastActiveTime'> = {
  users: persisted.users ?? [],
  currentUser: persisted.currentUser ?? null,
  failedAttempts: persisted.failedAttempts ?? {},
  lastActiveTime: Date.now(),
};

const bc = new BroadcastChannel('opd_auth_sync');

export const useAuth = create<AuthState>((set, get) => {
  const save = () => {
    const { users, currentUser, failedAttempts } = get();
    const payload = { users, currentUser, failedAttempts };
    try { localStorage.setItem('opd_auth', JSON.stringify(payload)); } catch {}
    bc.postMessage({ type: 'SYNC', state: payload });
  };

  return {
    ...initial,

    replaceState: (state) => {
      set(state);
      const { users, currentUser, failedAttempts } = get();
      try { localStorage.setItem('opd_auth', JSON.stringify({ users, currentUser, failedAttempts })); } catch {}
    },

    updateActivity: () => set({ lastActiveTime: Date.now() }),

    seedAdmin: async () => {
      const { users } = get();
      if (users.some(u => u.role === 'admin')) return;
      const salt = generateSalt();
      const admin: User = {
        id: crypto.randomUUID(),
        name: 'Administrator',
        email: 'admin@gmail.com',
        role: 'admin',
        passwordHash: await hashPassword('BioCode', salt),
        salt,
        active: true,
        mustChangePassword: false,
        createdAt: Date.now(),
        createdBy: 'system',
      };
      set({ users: [...users, admin] });
      save();
    },

    login: async (identifier, password) => {
      const { users, failedAttempts } = get();
      const low = identifier.toLowerCase().trim();
      const user = users.find(u =>
        (u.email && u.email.toLowerCase() === low) ||
        (u.phone && u.phone === identifier.trim())
      );
      const now = Date.now();

      if (!user) {
        // Don't reveal whether email exists
        await new Promise(r => setTimeout(r, 300)); // timing equalisation
        return 'Invalid credentials';
      }

      const attempts = failedAttempts[user.id] ?? { count: 0, lockedUntil: 0 };
      if (attempts.lockedUntil > now) {
        return `Account locked. Try again in ${Math.ceil((attempts.lockedUntil - now) / 60000)} min.`;
      }

      const hash = await hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        const count = attempts.count + 1;
        const lockedUntil = count >= 5 ? now + 5 * 60_000 : 0;
        const newAttempts = { ...failedAttempts, [user.id]: { count, lockedUntil } };
        set({ failedAttempts: newAttempts });
        save();
        if (lockedUntil) {
          await addAuditEntry({ timestamp: now, userId: user.id, userName: user.name, role: user.role, action: 'ACCOUNT_LOCKOUT' });
          return 'Too many attempts. Account locked for 5 minutes.';
        }
        await addAuditEntry({ timestamp: now, userId: user.id, userName: user.name, role: user.role, action: 'LOGIN_FAILED', reason: `Attempt ${count}` });
        return `Invalid credentials (${5 - count} attempt${5 - count !== 1 ? 's' : ''} left)`;
      }

      if (!user.active) {
        await addAuditEntry({ timestamp: now, userId: user.id, userName: user.name, role: user.role, action: 'LOGIN_DENIED', reason: 'Account deactivated' });
        return 'This account has been deactivated.';
      }

      const updated = { ...user, lastLogin: now };
      const newAttempts = { ...failedAttempts };
      delete newAttempts[user.id];
      set({ currentUser: updated, users: users.map(u => u.id === updated.id ? updated : u), failedAttempts: newAttempts, lastActiveTime: now });
      save();
      await addAuditEntry({ timestamp: now, userId: user.id, userName: user.name, role: user.role, action: 'LOGIN_SUCCESS' });
      return true;
    },

    logout: () => {
      const { currentUser } = get();
      if (currentUser) {
        addAuditEntry({ timestamp: Date.now(), userId: currentUser.id, userName: currentUser.name, role: currentUser.role, action: 'LOGOUT' });
      }
      set({ currentUser: null });
      save();
    },

    signUpPatient: async (name, phone, password, ageYears, sex, email) => {
      const { users } = get();
      if (users.some(u => u.phone && u.phone === phone)) return 'Mobile number already registered.';
      if (email && users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
        return 'Email already registered.';
      if (password.length < 8) return 'Password must be at least 8 characters.';

      const salt = generateSalt();
      const patient: User = {
        id: crypto.randomUUID(),
        name: name.trim(),
        phone,
        email: email?.trim() || undefined,
        role: 'patient',
        passwordHash: await hashPassword(password, salt),
        salt,
        active: true,
        mustChangePassword: false,
        createdAt: Date.now(),
        createdBy: 'self',
        ageYears,
        sex,
        dependents: [],
      };
      set({ users: [...users, patient] });
      save();
      await addAuditEntry({ timestamp: Date.now(), userId: patient.id, userName: patient.name, role: 'patient', action: 'USER_CREATED', reason: 'Self-registration' });
      return true;
    },

    createUser: async (params, actor) => {
      if (actor.role !== 'admin') throw new Error('Only admins can create staff accounts.');
      if (params.role === 'admin') throw new Error('Cannot create another admin via UI.');

      const { users } = get();
      const plainPass = params.password || generateTempPassword();
      const salt = generateSalt();
      const newUser: User & { _plainPass?: string } = {
        ...params,
        id: crypto.randomUUID(),
        passwordHash: await hashPassword(plainPass, salt),
        salt,
        createdAt: Date.now(),
        createdBy: actor.id,
        mustChangePassword: !params.password,
        _plainPass: plainPass,
      };
      set({ users: [...users, newUser] });
      save();
      await addAuditEntry({ timestamp: Date.now(), userId: actor.id, userName: actor.name, role: actor.role, action: 'USER_CREATED', to: newUser.id, reason: `Created ${newUser.role}: ${newUser.name}` });
      return newUser;
    },

    deactivateUser: (userId, actor) => {
      if (actor.role !== 'admin') throw new Error('Denied');
      const { users } = get();
      const u = users.find(u => u.id === userId);
      if (!u || u.role === 'admin') return;
      set({ users: users.map(u => u.id === userId ? { ...u, active: false } : u) });
      save();
      addAuditEntry({ timestamp: Date.now(), userId: actor.id, userName: actor.name, role: actor.role, action: 'USER_DEACTIVATED', to: userId });
    },

    reactivateUser: (userId, actor) => {
      if (actor.role !== 'admin') throw new Error('Denied');
      const { users } = get();
      set({ users: users.map(u => u.id === userId ? { ...u, active: true } : u) });
      save();
      addAuditEntry({ timestamp: Date.now(), userId: actor.id, userName: actor.name, role: actor.role, action: 'USER_REACTIVATED', to: userId });
    },

    resetPassword: async (userId, newPassword, actor) => {
      const { users } = get();
      const user = users.find(u => u.id === userId);
      if (!user) return null;
      if (actor && actor.role !== 'admin' && actor.id !== userId) throw new Error('Denied');

      const plain = newPassword || generateTempPassword();
      const salt = generateSalt();
      const passwordHash = await hashPassword(plain, salt);
      set({ users: users.map(u => u.id === userId ? { ...u, passwordHash, salt, mustChangePassword: !newPassword } : u) });
      save();
      const actingId = actor?.id ?? userId;
      const actingName = actor?.name ?? user.name;
      const actingRole = actor?.role ?? user.role;
      addAuditEntry({ timestamp: Date.now(), userId: actingId, userName: actingName, role: actingRole, action: 'PASSWORD_RESET', to: userId });
      return plain;
    },

    seedDemoStaff: async (actor) => {
      const { users } = get();
      const created: any[] = [];
      for (const role of ['doctor', 'nurse', 'clerk'] as Role[]) {
        if (!users.some(u => u.role === role)) {
          const u = await get().createUser({ name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, email: `${role}@demo.com`, role, active: true }, actor);
          created.push(u);
        }
      }
      return created;
    },

    addDependent: (dep) => {
      const { currentUser, users } = get();
      if (!currentUser || currentUser.role !== 'patient') return;
      if ((currentUser.dependents?.length ?? 0) >= 5) return;
      const updated = { ...currentUser, dependents: [...(currentUser.dependents ?? []), { ...dep, id: crypto.randomUUID() }] };
      set({ currentUser: updated, users: users.map(u => u.id === updated.id ? updated : u) });
      save();
    },
  };
});

bc.onmessage = (ev) => {
  if (ev.data?.type === 'SYNC') useAuth.getState().replaceState(ev.data.state);
};
