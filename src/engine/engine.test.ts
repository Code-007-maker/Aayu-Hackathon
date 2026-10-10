import { describe, it, expect } from 'vitest';
import { evaluateTriage, validateVitals, calculateUrgencyScore, PatientInputs } from './engine';

const bp: PatientInputs = {
  ageYears: 30,
  sex: 'male',
  pregnant: 'no',
  symptomTags: [],
  knownConditions: {},
  consciousness: 'alert',
  answeredByAttendant: false,
  answers: {},
};

describe('Triage Engine Acceptance Tests (v0.2-demo)', () => {
  it('1. Chest pain with sweating -> Immediate (R-CARD-01a)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['chest_pain', 'sweating'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-CARD-01a');
  });

  it('2. Chest pain alone -> Soon (R-CARD-01b)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['chest_pain'] });
    expect(res.priority).toBe('Soon');
    expect(res.firedRules).toContain('R-CARD-01b');
  });

  it('3. Fainting + age 50 -> Immediate (R-CARD-03a)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 50, symptomTags: ['fainting'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-CARD-03a');
  });

  it('4. Fainting + age 30 -> Soon (R-CARD-03b)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 30, symptomTags: ['fainting'] });
    expect(res.priority).toBe('Soon');
    expect(res.firedRules).toContain('R-CARD-03b');
  });

  it('5. High BP alone -> Soon + flag (R-HTN-01b)', () => {
    const res = evaluateTriage({ ...bp, vitals: { systolicBP: 190 } });
    expect(res.priority).toBe('Soon');
    expect(res.firedRules).toContain('R-HTN-01b');
    expect(res.flags).toContain('very high BP, recheck after 5 min rest');
  });

  it('6. High BP + severe headache -> Immediate (R-HTN-01a)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['severe_headache'], vitals: { systolicBP: 190 } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-HTN-01a');
  });

  it('7. Breathless at rest (answer) -> Immediate (R-RESP-01)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['breathless'], answers: { breathless_rest: true } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-RESP-01');
  });

  it('8. Coughing blood + breathless -> Immediate (R-INF-03b)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['cough', 'blood_in_cough', 'breathless'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-INF-03b');
  });

  it('9. Focal neuro (face droop) -> Immediate (R-NEURO-01)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['face_droop'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-NEURO-01');
  });

  it('10. Headache + sudden -> Immediate (R-NEURO-03a)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['headache'], answers: { ha_sudden: true } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-NEURO-03a');
  });

  it('11. Head injury + age < 2 -> Immediate (R-NEURO-04a)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 1, symptomTags: ['head_injury'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-NEURO-04a');
  });

  it('12. Vomiting blood -> Immediate (R-GI-01a)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['vomiting_blood'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-GI-01a');
  });

  it('13. Abdominal pain + rigid -> Immediate (R-GI-02a)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['abdominal_pain'], answers: { ap_rigid: true } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-GI-02a');
  });

  it('14. Fever + non blanching rash -> Immediate (R-INF-01)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['fever', 'non_blanching_rash'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-INF-01');
  });

  it('15. Major trauma (road accident) -> Immediate (R-TRAUMA-01)', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['road_accident'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-TRAUMA-01');
  });

  it('16. Pregnant with bleeding -> Immediate (R-OBS-01)', () => {
    const res = evaluateTriage({ ...bp, sex: 'female', pregnant: 'yes', symptomTags: ['pregnancy_bleeding'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-OBS-01');
  });

  it('17. Pregnant with HTN (160) -> Immediate (R-OBS-04a)', () => {
    const res = evaluateTriage({ ...bp, sex: 'female', pregnant: 'yes', vitals: { systolicBP: 165 } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-OBS-04a');
  });

  it('18. Glucose < 54 -> Immediate (R-DM-01a)', () => {
    const res = evaluateTriage({ ...bp, vitals: { bloodGlucose: 45 } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-DM-01a');
  });

  it('19. Pediatric danger sign (lethargic) -> Immediate (R-PED-01)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 5, symptomTags: ['child_lethargic'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-PED-01');
  });

  it('20. Neonate with fever -> Immediate (R-PED-03a)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 0.1, symptomTags: ['fever'] });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('R-PED-03a');
  });

  it('21. Routine presentation -> Routine (Low Acuity Pack)', () => {
    const res = evaluateTriage({ ...bp, ageYears: 25, symptomTags: ['minor_skin'] });
    expect(res.priority).toBe('Routine');
  });

  it('22. Modifier moves Routine to Soon if high risk', () => {
    const res = evaluateTriage({ ...bp, ageYears: 25, symptomTags: ['minor_skin'], knownConditions: { diabetes: true } });
    expect(res.priority).toBe('Soon');
    expect(res.firedRules).toContain('Modifier');
  });

  it('23. NEWS2 score >= 5 -> Immediate', () => {
    const res = evaluateTriage({ ...bp, symptomTags: ['cough'], vitals: { respiratoryRate: 25, spO2: 91 } });
    expect(res.priority).toBe('Immediate');
    expect(res.firedRules).toContain('NEWS2');
  });

  it('24. validateVitals checks out of bound glucose and diastolic', () => {
    expect(validateVitals({ bloodGlucose: 800 }).valid).toBe(false);
    expect(validateVitals({ bloodGlucose: 100 }).valid).toBe(true);
    expect(validateVitals({ diastolicBP: 300 }).valid).toBe(false);
    expect(validateVitals({ diastolicBP: 80 }).valid).toBe(true);
  });
  
  it('25. Urgency Score calculates correctly', () => {
    const s = calculateUrgencyScore('Immediate', 2, 70, { diabetes: true, hypertension: true }, 8, 30, []);
    // Immediate = 100
    // NEWS2(2) = 8
    // Age(70) = 5
    // Cond(2) = 8
    // Pain(8) = 8
    // Flags(comorb=2) = 6
    // WaitMins(30) = 3
    // Total = 100+8+5+8+8+6+3 = 138
    expect(s).toBe(138);
  });
});
