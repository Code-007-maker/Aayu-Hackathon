export type Priority = 'Immediate' | 'Soon' | 'Routine';

export interface Vitals {
  respiratoryRate?: number;
  spO2?: number;
  onOxygen?: boolean;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  temperature?: number;
  bloodGlucose?: number;
}

export interface PatientInputs {
  name?: string;
  ageYears: number;
  sex: 'male' | 'female' | 'other';
  pregnant: 'no' | 'yes' | 'possible';
  symptomTags: string[];
  knownConditions: {
    diabetes?: boolean;
    hypertension?: boolean;
    heartDisease?: boolean;
    lungDisease?: boolean;
    kidneyDisease?: boolean;
    immunosuppressed?: boolean;
    cancerOnTreatment?: boolean;
    onBloodThinners?: boolean;
    epilepsy?: boolean;
  };
  consciousness: 'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive';
  answeredByAttendant: boolean;
  
  painScore?: number;
  duration?: '<1 h' | '1-6 h' | '6-24 h' | '1-3 days' | '4-7 days' | '>1 week';
  onset?: 'sudden' | 'gradual';
  drugAllergies?: string;
  currentMedicines?: string;
  recentInjury?: string;
  headInjury?: boolean;
  recentSurgery?: boolean;
  pregnancyWeeks?: number;
  deliveredWithin6Weeks?: boolean;
  lastBloodSugar?: number;
  
  answers: Record<string, boolean>;
  
  vitals?: Vitals;
}

export interface TriageResult {
  priority: Priority;
  reasonLine: string;
  firedRules: string[];
  flags: string[];
  news2?: number;
  rulePackVersion: string;
}

export const RULE_PACK_VERSION = 'v0.2-demo';

const SAFE_LIST_TAGS = ['med_refill', 'followup', 'certificate', 'vaccination', 'minor_skin'];

export function validateVitals(vitals: Vitals): { valid: boolean; message?: string } {
  if (vitals.respiratoryRate !== undefined && (vitals.respiratoryRate < 4 || vitals.respiratoryRate > 60)) return { valid: false, message: 'Invalid respiratory rate (must be 4-60)' };
  if (vitals.spO2 !== undefined && (vitals.spO2 < 50 || vitals.spO2 > 100)) return { valid: false, message: 'Invalid SpO2 (must be 50-100)' };
  if (vitals.systolicBP !== undefined && (vitals.systolicBP < 40 || vitals.systolicBP > 300)) return { valid: false, message: 'Invalid systolic BP (must be 40-300)' };
  if (vitals.diastolicBP !== undefined && (vitals.diastolicBP < 20 || vitals.diastolicBP > 200)) return { valid: false, message: 'Invalid diastolic BP (must be 20-200)' };
  if (vitals.pulse !== undefined && (vitals.pulse < 20 || vitals.pulse > 250)) return { valid: false, message: 'Invalid pulse (must be 20-250)' };
  if (vitals.temperature !== undefined && (vitals.temperature < 30 || vitals.temperature > 45)) return { valid: false, message: 'Invalid temperature (must be 30-45)' };
  if (vitals.bloodGlucose !== undefined && (vitals.bloodGlucose < 20 || vitals.bloodGlucose > 700)) return { valid: false, message: 'Invalid glucose (must be 20-700)' };
  return { valid: true };
}

function calculateNEWS2(vitals: Vitals, consciousness: string): { score: number; maxSingle: number } {
  let score = 0; let maxSingle = 0;
  const add = (pts: number) => { score += pts; if (pts > maxSingle) maxSingle = pts; };

  if (vitals.respiratoryRate !== undefined) {
    const rr = vitals.respiratoryRate;
    if (rr <= 8) add(3); else if (rr >= 9 && rr <= 11) add(1); else if (rr >= 12 && rr <= 20) add(0); else if (rr >= 21 && rr <= 24) add(2); else if (rr >= 25) add(3);
  }
  if (vitals.spO2 !== undefined) {
    const spo2 = vitals.spO2;
    if (spo2 <= 91) add(3); else if (spo2 >= 92 && spo2 <= 93) add(2); else if (spo2 >= 94 && spo2 <= 95) add(1); else if (spo2 >= 96) add(0);
  }
  if (vitals.onOxygen) add(2);
  if (vitals.systolicBP !== undefined) {
    const sbp = vitals.systolicBP;
    if (sbp <= 90) add(3); else if (sbp >= 91 && sbp <= 100) add(2); else if (sbp >= 101 && sbp <= 110) add(1); else if (sbp >= 111 && sbp <= 219) add(0); else if (sbp >= 220) add(3);
  }
  if (vitals.pulse !== undefined) {
    const p = vitals.pulse;
    if (p <= 40) add(3); else if (p >= 41 && p <= 50) add(1); else if (p >= 51 && p <= 90) add(0); else if (p >= 91 && p <= 110) add(1); else if (p >= 111 && p <= 130) add(2); else if (p >= 131) add(3);
  }
  if (vitals.temperature !== undefined) {
    const t = vitals.temperature;
    if (t <= 35.0) add(3); else if (t >= 35.1 && t <= 36.0) add(1); else if (t >= 36.1 && t <= 38.0) add(0); else if (t >= 38.1 && t <= 39.0) add(1); else if (t >= 39.1) add(2);
  }
  if (consciousness !== 'alert') add(3);

  return { score, maxSingle };
}

export function evaluateTriage(inputs: PatientInputs): TriageResult {
  let priority: Priority = 'Routine';
  const firedRules: string[] = [];
  const flags: string[] = [];
  let reasonString = '';

  const tags = new Set(inputs.symptomTags);
  const hasTag = (tag: string) => tags.has(tag);
  const ans = (k: string) => !!inputs.answers[k];
  const cond = inputs.knownConditions;
  const isPregnant = inputs.pregnant === 'yes' || inputs.pregnant === 'possible';
  
  const raise = (p: Priority, ruleId: string, desc: string) => {
    if (priority === 'Routine' && (p === 'Soon' || p === 'Immediate')) { priority = p; reasonString = desc; firedRules.unshift(ruleId); }
    else if (priority === 'Soon' && p === 'Immediate') { priority = p; reasonString = desc; firedRules.unshift(ruleId); }
    else { firedRules.push(ruleId); }
  };

  // ----------------------------------------------------
  // Layer 1: Rules
  // ----------------------------------------------------
  
  // CARDIO/RESP
  if (hasTag('chest_pain')) {
    const cpHighRisk = hasTag('sweating') || ans('cp_rest_fainting') || ans('cp_over_20') || ans('cp_spreads') || ans('cp_exertion') || inputs.ageYears >= 40 || cond.heartDisease || cond.diabetes;
    if (cpHighRisk) {
      const why = [hasTag('sweating') && 'sweating', ans('cp_rest_fainting') && 'breathless/fainting', ans('cp_over_20') && 'lasts >20m', ans('cp_spreads') && 'spreads', ans('cp_exertion') && 'on exertion', inputs.ageYears >= 40 && 'age \u226540', cond.heartDisease && 'heart disease', cond.diabetes && 'diabetes'].filter(Boolean).join(', ');
      raise('Immediate', 'R-CARD-01a', `chest pain with ${why}`);
    } else raise('Soon', 'R-CARD-01b', 'chest pain');
  }

  if (hasTag('palpitations')) {
    if (hasTag('chest_pain') || hasTag('breathless') || hasTag('fainting') || hasTag('dizziness')) raise('Immediate', 'R-CARD-02', 'palpitations with chest pain/breathless/faint');
  }

  if (hasTag('fainting')) {
    if (inputs.ageYears >= 50 || cond.heartDisease || hasTag('palpitations') || hasTag('chest_pain') || ans('faint_exertion') || inputs.headInjury) {
      const why = [inputs.ageYears >= 50 && 'age \u226550', cond.heartDisease && 'heart disease', hasTag('palpitations') && 'palpitations', hasTag('chest_pain') && 'chest pain', ans('faint_exertion') && 'on exertion', inputs.headInjury && 'head injury'].filter(Boolean).join(', ');
      raise('Immediate', 'R-CARD-03a', `fainting with ${why}`);
    } else raise('Soon', 'R-CARD-03b', 'fainting');
  }

  if (!isPregnant && inputs.vitals && (inputs.vitals.systolicBP! >= 180 || inputs.vitals.diastolicBP! >= 120)) {
    if (hasTag('severe_headache') || hasTag('chest_pain') || hasTag('breathless') || hasTag('vision_loss') || hasTag('leg_weakness_numbness') || inputs.consciousness !== 'alert') {
      raise('Immediate', 'R-HTN-01a', 'hypertensive crisis with symptoms');
    } else {
      raise('Soon', 'R-HTN-01b', 'very high BP');
      flags.push('very high BP, recheck after 5 min rest');
    }
  }

  if (hasTag('breathless')) {
    if (ans('breathless_rest') || ans('breathless_speak')) raise('Immediate', 'R-RESP-01', 'breathless at rest or cannot speak');
    else if (ans('breathless_wheeze') && (cond.lungDisease)) { raise('Soon', 'R-RESP-02', 'wheeze with known lung disease'); flags.push('nurse review'); }
  }

  if (hasTag('cough')) {
    if (ans('cough_2w')) {
      raise('Soon', 'R-INF-03a', 'prolonged cough'); flags.push('TB screening for doctor');
    }
    if (hasTag('blood_in_cough')) {
      if (hasTag('breathless')) raise('Immediate', 'R-INF-03b', 'coughing blood and breathless');
      else { raise('Soon', 'R-INF-03c', 'coughing blood'); flags.push('TB screening for doctor'); }
    }
  }

  // NEURO
  if (hasTag('face_droop') || hasTag('slurred_speech') || hasTag('one_sided_weakness')) raise('Immediate', 'R-NEURO-01', 'focal neuro signs');
  if (hasTag('unconscious') || hasTag('seizure') || inputs.consciousness !== 'alert' || hasTag('confusion')) raise('Immediate', 'R-NEURO-02', 'altered consciousness/seizure');
  
  if (hasTag('headache') || hasTag('severe_headache')) {
    if (ans('ha_sudden') || hasTag('stiff_neck') || hasTag('fever') || hasTag('vomiting') || ans('ha_vision') || ans('ha_head_injury') || hasTag('confusion')) {
      const why = [ans('ha_sudden') && 'sudden worst ever', hasTag('stiff_neck') && 'stiff neck', hasTag('fever') && 'fever', hasTag('vomiting') && 'vomiting', ans('ha_vision') && 'vision change', ans('ha_head_injury') && 'after head injury', hasTag('confusion') && 'confusion'].filter(Boolean).join(', ');
      raise('Immediate', 'R-NEURO-03a', `severe headache with ${why}`);
    } else if (hasTag('severe_headache')) raise('Soon', 'R-NEURO-03b', 'severe headache');
  }

  if (hasTag('head_injury') || inputs.headInjury) {
    if (hasTag('vomiting') || inputs.consciousness === 'voice' || inputs.consciousness === 'pain' || hasTag('seizure') || ans('hi_ear_bleed') || cond.onBloodThinners || ans('hi_loc') || inputs.ageYears < 2 || inputs.ageYears >= 65) {
      const why = [cond.onBloodThinners && 'on blood thinners', ans('hi_loc') && 'lost consciousness', inputs.ageYears < 2 && 'age <2', inputs.ageYears >= 65 && 'age \u226565'].filter(Boolean).join(', ') || 'symptoms';
      raise('Immediate', 'R-NEURO-04a', `head injury with ${why}`);
    } else {
      raise('Soon', 'R-NEURO-04b', 'head injury'); flags.push('observe');
    }
  }

  if (hasTag('back_pain')) {
    if (hasTag('leg_weakness_numbness') || hasTag('bladder_bowel_loss') || ans('bp_saddle') || ans('bp_injury') || hasTag('fever') || cond.cancerOnTreatment) {
      const why = [hasTag('leg_weakness_numbness') && 'weakness/numbness', hasTag('bladder_bowel_loss') && 'incontinence', ans('bp_saddle') && 'saddle numbness', ans('bp_injury') && 'after injury', hasTag('fever') && 'fever', cond.cancerOnTreatment && 'known cancer'].filter(Boolean).join(', ');
      raise('Immediate', 'R-BACK-01', `back pain with ${why}`);
    }
  }

  // GI
  if (hasTag('vomiting_blood') || hasTag('black_stool')) {
    if (hasTag('vomiting_blood')) raise('Immediate', 'R-GI-01a', 'vomiting blood');
    else if (hasTag('dizziness') || hasTag('fainting') || hasTag('breathless') || inputs.ageYears >= 65 || cond.onBloodThinners) raise('Immediate', 'R-GI-01b', 'black stool with high risk');
    else { raise('Soon', 'R-GI-01c', 'black stool'); flags.push('vitals-first'); }
  }

  if (hasTag('abdominal_pain')) {
    if (ans('ap_rigid') || hasTag('vomiting') || hasTag('fever') || hasTag('fainting') || inputs.ageYears >= 60 || isPregnant) {
      const why = [ans('ap_rigid') && 'rigid/tender', hasTag('vomiting') && 'vomiting', hasTag('fever') && 'fever', hasTag('fainting') && 'fainting', inputs.ageYears >= 60 && 'age \u226560', isPregnant && 'pregnant'].filter(Boolean).join(', ');
      raise('Immediate', 'R-GI-02a', `abdominal pain with ${why}`);
    } else if ((inputs.painScore || 0) >= 8) {
      raise('Soon', 'R-GI-02b', 'severe abdominal pain (\u22658/10)');
    }
  }

  if (hasTag('vomiting') || hasTag('diarrhoea')) {
    if (hasTag('unable_to_drink') || hasTag('no_urine_8h') || hasTag('sunken_eyes_dry_mouth')) {
      if (inputs.ageYears < 5 || inputs.ageYears >= 65 || isPregnant || cond.diabetes) raise('Immediate', 'R-GI-03a', 'vomiting/diarrhoea with dehydration and high risk');
      else raise('Soon', 'R-GI-03b', 'vomiting/diarrhoea with dehydration signs');
    }
  }

  if (hasTag('jaundice')) {
    if (hasTag('confusion') || hasTag('abdominal_pain') || hasTag('vomiting') || hasTag('fever')) raise('Immediate', 'R-GI-04a', 'jaundice with symptoms');
    else raise('Soon', 'R-GI-04b', 'jaundice');
  }

  // INFECTION
  if (hasTag('fever')) {
    if (hasTag('stiff_neck') || hasTag('non_blanching_rash') || hasTag('photophobia') || hasTag('confusion') || hasTag('seizure')) {
      const why = [hasTag('stiff_neck') && 'stiff neck', hasTag('non_blanching_rash') && 'rash', hasTag('photophobia') && 'photophobia', hasTag('confusion') && 'confusion', hasTag('seizure') && 'seizure'].filter(Boolean).join(', ');
      raise('Immediate', 'R-INF-01', `fever with ${why}`);
    }
    if (cond.immunosuppressed || cond.cancerOnTreatment) raise('Immediate', 'R-INF-02b', 'fever in immunosuppressed/cancer');
    if (ans('fever_5d')) { raise('Soon', 'R-INF-02a', 'fever \u22655 days'); flags.push('prolonged fever, doctor to evaluate'); }
    if (inputs.vitals?.temperature! >= 39.0 && inputs.ageYears < 5) { raise('Soon', 'R-INF-02c', 'high fever in child'); flags.push('senior review'); }
  }

  if (hasTag('animal_bite') || inputs.recentInjury === 'animal bite') {
    raise('Soon', 'R-INF-04', 'animal bite'); flags.push('bite exposure, doctor to assess time-sensitive care');
  }

  // TRAUMA
  if (hasTag('road_accident') || hasTag('fall_from_height') || inputs.recentInjury === 'road accident' || inputs.recentInjury === 'fall') raise('Immediate', 'R-TRAUMA-01', 'major trauma mechanism');
  if (hasTag('fracture_suspected')) {
    if (ans('frac_open') || ans('frac_cold') || hasTag('heavy_bleeding')) raise('Immediate', 'R-TRAUMA-02a', 'suspected fracture with complication');
    else { raise('Soon', 'R-TRAUMA-02b', 'suspected fracture'); flags.push('orthopaedic'); }
  }
  if (hasTag('burn') || inputs.recentInjury === 'burn') {
    if (ans('burn_face') || ans('burn_large') || hasTag('breathless')) raise('Immediate', 'R-BURN-01a', 'major or high-risk burn');
    else raise('Soon', 'R-BURN-01b', 'small burn');
  }
  if (hasTag('deep_wound')) {
    if (hasTag('heavy_bleeding')) raise('Immediate', 'R-WOUND-01a', 'deep wound with heavy bleeding');
    else raise('Soon', 'R-WOUND-01b', 'deep wound');
  }

  // EYE/AIRWAY/URO
  if (hasTag('vision_loss') || hasTag('eye_injury_chemical')) raise('Immediate', 'R-EYE-01', 'vision loss or chemical eye injury');
  if (hasTag('choking_swallowed_object')) {
    if (hasTag('breathless') || ans('choke_speak')) raise('Immediate', 'R-AIRWAY-01', 'choking and breathless');
  }
  if (hasTag('testicular_pain_sudden')) { raise('Soon', 'R-URO-01a', 'sudden testicular pain'); flags.push('vitals-first'); }
  if (hasTag('urinary_retention')) { raise('Soon', 'R-URO-01b', 'urinary retention'); flags.push('vitals-first'); }

  // OBSTETRIC
  if (inputs.pregnant === 'yes') {
    if (hasTag('pregnancy_bleeding') || hasTag('heavy_bleeding') || hasTag('severe_headache') || hasTag('seizure') || hasTag('reduced_fetal_movement') || hasTag('vision_loss') || hasTag('fever')) {
      raise('Immediate', 'R-OBS-01', 'pregnant with red-flag symptoms');
    }
    if (hasTag('labour_signs') || hasTag('fluid_leaking')) raise('Immediate', 'R-OBS-02', 'labour signs or leaking');
    if (inputs.vitals) {
      if (inputs.vitals.systolicBP! >= 160 || inputs.vitals.diastolicBP! >= 110) raise('Immediate', 'R-OBS-04a', 'pregnant with severe hypertension');
      else if (inputs.vitals.systolicBP! >= 140 || inputs.vitals.diastolicBP! >= 90) {
        if (hasTag('headache') || hasTag('vision_loss') || ans('obs_swelling')) raise('Immediate', 'R-OBS-04b', 'pregnant with hypertension and symptoms');
        else { raise('Soon', 'R-OBS-04c', 'pregnant with hypertension'); flags.push('senior review'); }
      }
      if (inputs.vitals.spO2! < 95 || inputs.vitals.respiratoryRate! > 24 || inputs.vitals.pulse! > 120) raise('Immediate', 'R-OBS-06', 'pregnant with abnormal vitals');
    }
  }
  if (isPregnant && hasTag('abdominal_pain') && (inputs.painScore || 0) >= 7) raise('Immediate', 'R-OBS-03', 'pregnant/possible pregnant with severe abdominal pain');
  if (inputs.deliveredWithin6Weeks) {
    if (hasTag('heavy_bleeding') || hasTag('fever') || hasTag('severe_headache') || hasTag('breathless') || hasTag('seizure')) raise('Immediate', 'R-OBS-05', 'postpartum with red-flag symptoms');
  }

  // DIABETES
  const gluc = inputs.vitals?.bloodGlucose;
  if (gluc !== undefined) {
    if (gluc < 54) raise('Immediate', 'R-DM-01a', 'severe hypoglycemia (<54)');
    else if (gluc < 70 && (hasTag('sweating') || hasTag('tremor_shaking') || hasTag('hunger_weakness') || hasTag('confusion'))) raise('Immediate', 'R-DM-01b', 'symptomatic hypoglycemia (<70)');
    
    if (cond.diabetes) {
      if (gluc > 250 && (hasTag('vomiting') || hasTag('abdominal_pain') || hasTag('fast_breathing') || inputs.consciousness !== 'alert')) raise('Immediate', 'R-DM-02a', 'diabetes with hyperglycemia (>250) and symptoms');
      else if (gluc > 300 && tags.size > 0) raise('Immediate', 'R-DM-02b', 'hyperglycemia (>300) with any symptom');
      else if (gluc > 250) { raise('Soon', 'R-DM-02c', 'hyperglycemia (>250)'); flags.push('high blood sugar'); }
    }
  }
  if (cond.diabetes && ans('dm_foot') && (hasTag('fever') || ans('dm_redness'))) { raise('Soon', 'R-DM-03', 'diabetic foot infection'); flags.push('senior review'); }

  // PAEDIATRIC
  if (inputs.ageYears < 16) {
    if (hasTag('child_lethargic') || hasTag('child_not_feeding') || hasTag('unable_to_drink') || ans('ped_vomits_all') || hasTag('convulsions') || hasTag('seizure') || hasTag('chest_indrawing') || hasTag('child_fast_breathing')) {
      const why = [hasTag('child_lethargic') && 'lethargic', hasTag('unable_to_drink') && 'unable to drink', hasTag('chest_indrawing') && 'chest indrawing', hasTag('child_fast_breathing') && 'fast breathing'].filter(Boolean).join(', ') || 'danger signs';
      raise('Immediate', 'R-PED-01', `paediatric danger signs (${why})`);
    }
    
    if (inputs.vitals?.respiratoryRate) {
      const rr = inputs.vitals.respiratoryRate;
      const m = inputs.ageYears * 12;
      if (m < 2 && rr >= 60) raise('Immediate', 'R-PED-02a', 'severe tachypnea (<2m)');
      else if (m >= 2 && m < 12 && rr >= 50) raise('Immediate', 'R-PED-02b', 'severe tachypnea (2-11m)');
      else if (m >= 12 && m < 60 && rr >= 40) raise('Immediate', 'R-PED-02c', 'severe tachypnea (1-5y)');
      else if (m >= 60 && rr >= 30) raise('Immediate', 'R-PED-02d', 'severe tachypnea (5-15y)');
    }
    if (inputs.vitals?.spO2 && inputs.vitals.spO2 < 92) raise('Immediate', 'R-PED-02e', 'hypoxia (SpO2 < 92%)');

    if (inputs.ageYears < 0.25) {
      if (hasTag('fever')) raise('Immediate', 'R-PED-03a', 'neonate with fever');
      else if (tags.size > 0 && priority === 'Routine') { raise('Soon', 'R-PED-03b', 'neonate with symptoms'); flags.push('senior review'); }
    }
  }

  // TOX/ENV/MH
  if (hasTag('poisoning') || ans('tox_overdose') || ans('tox_pesticide') || hasTag('snakebite_scorpion')) raise('Immediate', 'R-TOX-01', 'poisoning/overdose/envenomation');
  if (hasTag('heat_collapse') || inputs.vitals?.temperature! >= 40.0) raise('Immediate', 'R-HEAT-01', 'heat collapse or temp \u226540.0');
  if (hasTag('allergic_swelling') || (hasTag('skin_rash') && (hasTag('breathless') || ans('rash_swelling')))) raise('Immediate', 'R-ALLERGY-01', 'severe allergy/anaphylaxis');
  
  if (hasTag('self_harm_thoughts')) { raise('Immediate', 'R-MH-01', 'mental health emergency'); flags.push('discreet: self-harm risk'); }
  if (hasTag('agitation_psychosis')) { raise('Soon', 'R-MH-02', 'agitation/psychosis'); flags.push('needs a quiet space', 'senior review'); }

  // ----------------------------------------------------
  // Layer 2: Routine Pack & Missing Data Policy
  // ----------------------------------------------------
  
  const nonSafeTags = inputs.symptomTags.filter(t => !SAFE_LIST_TAGS.includes(t));
  let news2Score: number | undefined;
  
  // Baseline if no rules fired
  if (firedRules.length === 0 && nonSafeTags.length > 0) {
    raise('Soon', 'Baseline', 'symptoms present');
  }
  
  if (inputs.ageYears >= 16 && !isPregnant && inputs.vitals && Object.keys(inputs.vitals).length > 0) {
    const { score, maxSingle } = calculateNEWS2(inputs.vitals, inputs.consciousness);
    news2Score = score;
    if (score >= 5 || maxSingle === 3) {
      raise('Immediate', 'NEWS2', 'High NEWS2 score (\u22655 or single parameter 3)');
    } else if (score >= 1 && score <= 4) {
      raise('Soon', 'NEWS2', 'NEWS2 score 1-4');
    }
  }

  // Routine Check
  // "Routine ONLY if every selected symptom is low-acuity AND age 5-64 AND not pregnant AND no high risk AND alert AND pain<=4 AND no rule fired AND (vitals missing or NEWS2=0)"
  const allowLowAcuity = true; // Admin setting in real life
  if (allowLowAcuity && priority === 'Soon' && firedRules.length === 1 && firedRules[0] === 'Baseline') {
    const isLowRiskDemographics = inputs.ageYears >= 5 && inputs.ageYears <= 64 && !isPregnant && !cond.diabetes && !cond.heartDisease && !cond.lungDisease && !cond.kidneyDisease && !cond.immunosuppressed && !cond.onBloodThinners && inputs.consciousness === 'alert' && (inputs.painScore || 0) <= 4;
    
    const lowAcuitySymptoms = ['joint_pain', 'skin_rash', 'back_pain', 'cough', 'headache', 'abdominal_pain', 'diarrhoea', 'minor_skin', ...SAFE_LIST_TAGS];
    const allSymptomsLowAcuity = nonSafeTags.every(t => lowAcuitySymptoms.includes(t));
    
    // Explicit exclusions based on text
    const hasRedFlags = hasTag('breathless') || hasTag('blood_in_cough') || hasTag('vomiting') || hasTag('fever') || ans('ha_sudden') || ans('ha_vision') || ans('rash_swelling') || hasTag('unable_to_drink');

    if (isLowRiskDemographics && allSymptomsLowAcuity && !hasRedFlags && (news2Score === undefined || news2Score === 0)) {
      priority = 'Routine';
      reasonString = 'routine presentation';
      firedRules.length = 0; // Clear the baseline 'Soon' rule
      if (news2Score === undefined && nonSafeTags.length > 0) flags.push('routine without vitals');
    }
  }

  // Modifiers
  if (priority === 'Routine') {
    if (inputs.ageYears >= 65 || cond.diabetes || cond.heartDisease || cond.lungDisease || cond.immunosuppression) {
      raise('Soon', 'Modifier', 'high risk condition modifier');
    }
  }

  // Missing data policy
  let hasVitals = inputs.vitals && Object.keys(inputs.vitals).length > 0;
  if (!hasVitals && nonSafeTags.length > 0 && priority !== 'Routine') {
    flags.push('vitals pending');
  }
  if (!hasVitals && (inputs.ageYears < 16 || isPregnant)) {
    flags.push('senior review');
  }
  if (cond.lungDisease) {
    flags.push('nurse review: SpO2 scale 2 may apply');
  }
  if (inputs.answeredByAttendant) {
    flags.push('answered by attendant');
  }

  const primaryRule = firedRules.length > 0 ? firedRules[0] + ': ' : '';
  let finalReasonLine = `${primaryRule}${reasonString || 'routine presentation'}, ${inputs.ageYears} y ${inputs.sex}.`;
  if (flags.includes('vitals pending')) finalReasonLine += ' Vitals pending.';
  finalReasonLine += ` Rules ${RULE_PACK_VERSION}.`;

  return {
    priority,
    reasonLine: finalReasonLine,
    firedRules,
    flags,
    news2: news2Score,
    rulePackVersion: RULE_PACK_VERSION,
  };
}

export function calculateUrgencyScore(priority: Priority, news2: number, age: number, cond: any, pain: number, waitMins: number, flags: string[]): number {
  let score = 0;
  if (priority === 'Immediate') score += 100;
  else if (priority === 'Soon') score += 50;
  else score += 10;
  
  score += 4 * news2;
  
  if (age < 2 || age >= 75) score += 10;
  else if (age >= 65 && age <= 74) score += 5;
  
  let comorbiditiesCount = 0;
  if (cond.diabetes) comorbiditiesCount++;
  if (cond.hypertension) comorbiditiesCount++;
  if (cond.heartDisease) comorbiditiesCount++;
  if (cond.lungDisease) comorbiditiesCount++;
  if (cond.kidneyDisease) comorbiditiesCount++;
  if (cond.immunosuppressed) comorbiditiesCount++;
  if (cond.cancerOnTreatment) comorbiditiesCount++;
  if (cond.onBloodThinners) comorbiditiesCount++;
  if (cond.epilepsy) comorbiditiesCount++;
  score += 4 * Math.min(comorbiditiesCount, 12);
  
  score += pain;
  
  // 3x amber flags: age extremes (done), each comorbidity (done), etc.
  score += 3 * ((age < 2 || age >= 75) ? 1 : 0);
  score += 3 * comorbiditiesCount;
  
  score += Math.min(20, Math.floor(waitMins / 10));
  
  return score;
}
