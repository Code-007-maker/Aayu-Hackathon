import React from 'react';
import { RULE_PACK_VERSION } from '../engine/engine';
import { ClipboardList, ShieldAlert, GitPullRequest } from 'lucide-react';

export default function Rules() {
  const rules = [
    { id: 'R-CARD-01', desc: 'Chest pain with sweating, breathlessness at rest, or fainting', res: 'Immediate' },
    { id: 'R-CARD-01', desc: 'Chest pain in patient ≥40 or with heart disease', res: 'Immediate' },
    { id: 'R-CARD-01', desc: 'Chest pain (other)', res: 'Soon' },
    { id: 'R-RESP-01', desc: 'Breathless at rest', res: 'Immediate' },
    { id: 'R-NEURO-01', desc: 'Face droop, slurred speech, or one-sided weakness', res: 'Immediate' },
    { id: 'R-NEURO-02', desc: 'Unconscious, seizure, or consciousness not alert', res: 'Immediate' },
    { id: 'R-BLEED-01', desc: 'Heavy bleeding or vomiting blood', res: 'Immediate' },
    { id: 'R-ALLERGY-01', desc: 'Allergic swelling or wheeze with breathlessness', res: 'Immediate' },
    { id: 'R-TOX-01', desc: 'Poisoning or snake/scorpion bite', res: 'Immediate' },
    { id: 'R-HEAT-01', desc: 'Heat collapse', res: 'Immediate' },
    { id: 'R-OBS-01', desc: 'Pregnant AND (bleeding, heavy bleeding, severe headache, seizure, or reduced fetal movement)', res: 'Immediate' },
    { id: 'R-PED-01', desc: 'Age <16 AND (lethargic, not feeding, fast breathing, or seizure)', res: 'Immediate' },
    { id: 'R-PED-01', desc: 'Age <3 months AND fever', res: 'Immediate' },
    { id: 'R-MH-01', desc: 'Self harm thoughts', res: 'Immediate (Discreet)' },
    { id: 'Baseline', desc: 'Any other non-safe-list symptom', res: 'Soon' },
    { id: 'Baseline', desc: 'Safe-list symptoms only (refill, certificate, etc)', res: 'Routine' },
    { id: 'Missing Data', desc: 'No vitals + non-safe-list symptom', res: 'Soon + "vitals pending"' },
    { id: 'Missing Data', desc: 'Age <16 or Pregnant (NEWS2 not applicable)', res: 'Soon + "senior review"' },
  ];

  const getBadgeClass = (res: string) => {
    if (res.includes('Immediate')) return 'badge-immediate';
    if (res.includes('Soon')) return 'badge-soon';
    return 'badge-routine';
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList className="text-[#0E7C86]" size={22} /> Clinical Triage Rules
          </h1>
          <p className="page-subtitle flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#B7740A]"/>
            Rules are clinician-editable and must be clinician-approved before real use.
          </p>
        </div>
        <div className="bg-[#E8F4F8] border border-[#0E7C86]/30 text-[#0E7C86] font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2">
          <GitPullRequest size={16}/> {RULE_PACK_VERSION}
        </div>
      </div>

      <div className="card overflow-hidden mb-8">
        <div className="card-header bg-[#F4F9FB]">
          <h2 className="text-sm font-black text-[#12324A] uppercase tracking-wide">Layer 1: Symptom Rules</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F9FB] border-b border-[#D6E4EA]">
              <tr>
                <th className="px-5 py-3 text-xs font-black text-[#4A5B6B] uppercase tracking-wide">Rule ID</th>
                <th className="px-5 py-3 text-xs font-black text-[#4A5B6B] uppercase tracking-wide">Description</th>
                <th className="px-5 py-3 text-xs font-black text-[#4A5B6B] uppercase tracking-wide">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E4EA]">
              {rules.map((r, i) => (
                <tr key={i} className="hover:bg-[#F4F9FB] transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-[#4A5B6B] text-[11px] whitespace-nowrap">{r.id}</td>
                  <td className="px-5 py-4 font-medium text-[#12324A]">{r.desc}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={getBadgeClass(r.res)}>{r.res}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="card overflow-hidden flex flex-col">
          <div className="card-header bg-[#F4F9FB]">
            <h2 className="text-sm font-black text-[#12324A] uppercase tracking-wide">Layer 2: Modified NEWS2</h2>
          </div>
          <div className="p-6 text-sm text-[#4A5B6B] leading-relaxed flex-1">
            <p className="font-bold text-[#12324A] mb-3">(Age ≥16, Not Pregnant)</p>
            <ul className="space-y-1 mb-6 font-medium text-xs">
              <li><strong className="text-[#12324A]">Resp Rate:</strong> ≤8 (3), 9-11 (1), 12-20 (0), 21-24 (2), ≥25 (3)</li>
              <li><strong className="text-[#12324A]">SpO2:</strong> ≤91 (3), 92-93 (2), 94-95 (1), ≥96 (0)</li>
              <li><strong className="text-[#12324A]">Oxygen:</strong> On Oxygen (2), Air (0)</li>
              <li><strong className="text-[#12324A]">Systolic BP:</strong> ≤90 (3), 91-100 (2), 101-110 (1), 111-219 (0), ≥220 (3)</li>
              <li><strong className="text-[#12324A]">Pulse:</strong> ≤40 (3), 41-50 (1), 51-90 (0), 91-110 (1), 111-130 (2), ≥131 (3)</li>
              <li><strong className="text-[#12324A]">Consciousness:</strong> Alert (0), Anything else (3)</li>
              <li><strong className="text-[#12324A]">Temp:</strong> ≤35.0 (3), 35.1-36.0 (1), 36.1-38.0 (0), 38.1-39.0 (1), ≥39.1 (2)</li>
            </ul>
            <div className="p-4 bg-[#FCE6E3] border border-[#C62F2F]/30 rounded-xl font-bold text-[#C62F2F] text-xs leading-relaxed">
              <strong>Mapping:</strong> Total score ≥5 OR any single parameter = 3 → IMMEDIATE.<br/>
              Total score 1-4 → at least SOON.
            </div>
          </div>
        </div>

        <div className="card overflow-hidden flex flex-col">
          <div className="card-header bg-[#F4F9FB]">
            <h2 className="text-sm font-black text-[#12324A] uppercase tracking-wide">Layer 3: Modifiers</h2>
          </div>
          <div className="p-6 text-sm text-[#4A5B6B] font-medium leading-relaxed flex-1">
            <p className="mb-4">
              Modifiers automatically raise priority based on age and pre-existing conditions, ensuring vulnerable patients are seen faster even for routine presentations.
            </p>
            <p className="p-4 bg-[#FBEFD6] border border-[#B7740A]/30 rounded-xl text-[#B7740A] text-xs font-bold leading-relaxed">
              Age ≥65 or history of Diabetes, Heart Disease, Lung Disease, or Immunosuppression raises 
              <span className="mx-1.5 badge-routine inline-flex">ROUTINE</span> to
              <span className="mx-1.5 badge-soon inline-flex">SOON</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
