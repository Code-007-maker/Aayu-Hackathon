export interface AuditEntry {
  id: string;
  timestamp: number;
  token?: number;
  userId?: string;
  userName?: string;
  role?: string;
  action: string;
  from?: string;
  to?: string;
  reason?: string;
  systemSuggestion?: string;
  inputsSnapshot?: any;
  rulePackVersion?: string;
  prevHash: string;
  hash: string;
}

// In-memory or local storage audit log
let auditLog: AuditEntry[] = [];

// Initialize from local storage if exists
try {
  const stored = localStorage.getItem('opd_audit_log');
  if (stored) {
    auditLog = JSON.parse(stored);
  }
} catch (e) {}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'prevHash' | 'hash'>): Promise<AuditEntry> {
  const prevEntry = auditLog[auditLog.length - 1];
  const prevHash = prevEntry ? prevEntry.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  
  const id = crypto.randomUUID();
  const dataToHash = `${id}|${entry.timestamp}|${entry.token}|${entry.userId}|${entry.userName}|${entry.role}|${entry.action}|${entry.from}|${entry.to}|${entry.reason}|${entry.rulePackVersion}|${prevHash}`;
  
  const hash = await sha256(dataToHash);
  
  const fullEntry: AuditEntry = {
    ...entry,
    id,
    prevHash,
    hash,
  };
  
  auditLog.push(fullEntry);
  localStorage.setItem('opd_audit_log', JSON.stringify(auditLog));
  
  // Notify tabs
  const bc = new BroadcastChannel('opd_audit_sync');
  bc.postMessage({ type: 'NEW_ENTRY', entry: fullEntry });
  bc.close();
  
  return fullEntry;
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export async function verifyAuditChain(): Promise<boolean> {
  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  for (const entry of auditLog) {
    if (entry.prevHash !== expectedPrevHash) return false;
    const dataToHash = `${entry.id}|${entry.timestamp}|${entry.token}|${entry.userId}|${entry.userName}|${entry.role}|${entry.action}|${entry.from}|${entry.to}|${entry.reason}|${entry.rulePackVersion}|${entry.prevHash}`;
    const hash = await sha256(dataToHash);
    if (hash !== entry.hash) return false;
    expectedPrevHash = hash;
  }
  return true;
}

export function simulateTampering() {
  if (auditLog.length > 0) {
    const idx = Math.floor(Math.random() * auditLog.length);
    auditLog[idx].action = 'TAMPERED_ACTION';
    localStorage.setItem('opd_audit_log', JSON.stringify(auditLog));
  }
}

// Listen for sync
const bc = new BroadcastChannel('opd_audit_sync');
bc.onmessage = (event) => {
  if (event.data.type === 'NEW_ENTRY') {
    const exists = auditLog.some(e => e.id === event.data.entry.id);
    if (!exists) {
      auditLog.push(event.data.entry);
      localStorage.setItem('opd_audit_log', JSON.stringify(auditLog));
    }
  }
};
