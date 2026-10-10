export const TAGS_DICT: Record<string, { en: string, hi: string, safe?: boolean }> = {
  chest_pain: { en: 'Chest Pain', hi: 'सीने में दर्द' },
  sweating: { en: 'Sweating', hi: 'पसीना' },
  palpitations: { en: 'Palpitations', hi: 'धड़कन तेज होना' },
  fainting: { en: 'Fainting', hi: 'बेहोशी/चक्कर' },
  confusion: { en: 'Confusion', hi: 'उलझन' },
  unconscious: { en: 'Unconscious', hi: 'बेहोश' },
  seizure: { en: 'Seizure', hi: 'दौरा' },
  face_droop: { en: 'Face Droop', hi: 'चेहरा टेढ़ा होना' },
  slurred_speech: { en: 'Slurred Speech', hi: 'आवाज़ लड़खड़ाना' },
  one_sided_weakness: { en: 'One-sided Weakness', hi: 'एक तरफ कमजोरी' },
  severe_headache: { en: 'Severe Headache', hi: 'तेज सिरदर्द' },
  heavy_bleeding: { en: 'Heavy Bleeding', hi: 'भारी रक्तस्राव' },
  vomiting_blood: { en: 'Vomiting Blood', hi: 'खून की उल्टी' },
  black_stool: { en: 'Black Stool', hi: 'काला मल' },
  severe_abdominal_pain: { en: 'Severe Abdominal Pain', hi: 'तेज पेट दर्द' },
  fever: { en: 'Fever', hi: 'बुखार' },
  cough: { en: 'Cough', hi: 'खांसी' },
  vomiting: { en: 'Vomiting', hi: 'उल्टी' },
  diarrhoea: { en: 'Diarrhoea', hi: 'दस्त' },
  dizziness: { en: 'Dizziness', hi: 'चक्कर आना' },
  allergic_swelling: { en: 'Allergic Swelling', hi: 'एलर्जी से सूजन' },
  wheeze: { en: 'Wheeze', hi: 'सांस में सीटी' },
  poisoning: { en: 'Poisoning', hi: 'जहर' },
  snakebite_scorpion: { en: 'Snake/Scorpion Bite', hi: 'सांप/बिच्छू का काटना' },
  heat_collapse: { en: 'Heat Collapse', hi: 'गर्मी से चक्कर' },
  pregnancy_bleeding: { en: 'Pregnancy Bleeding', hi: 'गर्भावस्था में रक्तस्राव' },
  reduced_fetal_movement: { en: 'Reduced Fetal Movement', hi: 'गर्भ में कम हलचल' },
  child_lethargic: { en: 'Child Lethargic', hi: 'बच्चा सुस्त है' },
  child_not_feeding: { en: 'Child Not Feeding', hi: 'बच्चा दूध नहीं पी रहा' },
  child_fast_breathing: { en: 'Child Fast Breathing', hi: 'बच्चे की तेज सांस' },
  self_harm_thoughts: { en: 'Self Harm Thoughts', hi: 'खुद को नुकसान का विचार' },
  joint_pain: { en: 'Joint Pain', hi: 'जोड़ों में दर्द' },
  skin_rash: { en: 'Skin Rash', hi: 'त्वचा पर दाने' },
  back_pain: { en: 'Back Pain', hi: 'कमर दर्द' },
  
  // New Tags
  breathless: { en: 'Breathless', hi: 'सांस फूलना' },
  headache: { en: 'Headache', hi: 'सिरदर्द' },
  abdominal_pain: { en: 'Abdominal Pain', hi: 'पेट दर्द' },
  burning_pain: { en: 'Burning Pain', hi: 'जलन' },
  blood_in_cough: { en: 'Blood in Cough', hi: 'खांसी में खून' },
  stiff_neck: { en: 'Stiff Neck', hi: 'गर्दन में अकड़न' },
  non_blanching_rash: { en: 'Non-blanching Rash', hi: 'न दबने वाले दाने' },
  photophobia: { en: 'Photophobia', hi: 'रोशनी से परेशानी' },
  jaundice: { en: 'Jaundice', hi: 'पीलिया' },
  unable_to_drink: { en: 'Unable to drink', hi: 'पीने में असमर्थ' },
  no_urine_8h: { en: 'No urine for 8h', hi: '8 घंटे से पेशाब नहीं' },
  sunken_eyes_dry_mouth: { en: 'Sunken eyes/Dry mouth', hi: 'धंसी आंखें/सूखा मुंह' },
  road_accident: { en: 'Road Accident', hi: 'सड़क दुर्घटना' },
  fall_from_height: { en: 'Fall from height', hi: 'ऊंचाई से गिरना' },
  head_injury: { en: 'Head Injury', hi: 'सिर की चोट' },
  burn: { en: 'Burn', hi: 'जलना' },
  fracture_suspected: { en: 'Fracture Suspected', hi: 'हड्डी टूटने का शक' },
  animal_bite: { en: 'Animal Bite', hi: 'जानवर का काटना' },
  deep_wound: { en: 'Deep Wound', hi: 'गहरा घाव' },
  vision_loss: { en: 'Vision Loss', hi: 'नज़र जाना' },
  eye_injury_chemical: { en: 'Eye Injury/Chemical', hi: 'आंख में चोट/केमिकल' },
  urinary_retention: { en: 'Urinary Retention', hi: 'पेशाब रुकना' },
  testicular_pain_sudden: { en: 'Sudden Testicular Pain', hi: 'अंडकोष में अचानक दर्द' },
  leg_weakness_numbness: { en: 'Leg Weakness/Numbness', hi: 'पैर में कमजोरी/सुन्न' },
  bladder_bowel_loss: { en: 'Bladder/Bowel Loss', hi: 'मल/मूत्र पर नियंत्रण न रहना' },
  labour_signs: { en: 'Labour Signs', hi: 'प्रसव पीड़ा' },
  fluid_leaking: { en: 'Fluid Leaking', hi: 'पानी छूटना' },
  tremor_shaking: { en: 'Tremor/Shaking', hi: 'कांपना' },
  hunger_weakness: { en: 'Hunger/Weakness', hi: 'भूख/कमजोरी' },
  agitation_psychosis: { en: 'Agitation/Psychosis', hi: 'बेचैनी/पागलपन' },
  choking_swallowed_object: { en: 'Choking/Swallowed Object', hi: 'गले में फंदा/कुछ निगलना' },
  chest_indrawing: { en: 'Chest Indrawing', hi: 'पसलियां चलना' },
  nosebleed: { en: 'Nosebleed', hi: 'नकसीर' },
  swelling_leg: { en: 'Swelling Leg', hi: 'पैर में सूजन' },

  // Safe-list
  med_refill: { en: 'Medicine Refill', hi: 'दवा लेना', safe: true },
  followup: { en: 'Follow-up', hi: 'दिखाने आना', safe: true },
  certificate: { en: 'Certificate', hi: 'प्रमाणपत्र', safe: true },
  vaccination: { en: 'Vaccination', hi: 'टीकाकरण', safe: true },
  minor_skin: { en: 'Minor Skin Issue', hi: 'त्वचा की मामूली समस्या', safe: true },
};

export const LEXICON = [
  { tag: 'fever', phrases: ['bukhar', 'fever', 'बुखार', 'tapman', 'तापमान'] },
  { tag: 'chest_pain', phrases: ['seene mein dard', 'chhati mein dard', 'chest pain', 'seena dard', 'सीने में दर्द', 'छाती में दर्द', 'सीने दर्द'] },
  { tag: 'sweating', phrases: ['pasina', 'sweat', 'paseena', 'पसीना'] },
  { tag: 'breathless', phrases: ['saans phoolna', 'saans lene mein dikkat', 'breathing problem', 'sans fulna', 'saans nahi aa rahi', 'सांस फूलना', 'सांस नहीं आ रही', 'सांस लेने में दिक्कत', 'breathless'] },
  { tag: 'dizziness', phrases: ['chakkar', 'dizziness', 'चक्कर'] },
  { tag: 'vomiting', phrases: ['ulti', 'vomit', 'vomiting', 'ubkai', 'उल्टी', 'उबकाई'] },
  { tag: 'diarrhoea', phrases: ['dast', 'loose motion', 'diarrhoea', 'दस्त'] },
  { tag: 'cough', phrases: ['khasi', 'khaasi', 'cough', 'खांसी'] },
  { tag: 'headache', phrases: ['sir dard', 'sir mein dard', 'headache', 'सिर दर्द', 'सिर में दर्द'] },
  { tag: 'abdominal_pain', phrases: ['pet dard', 'pet mein dard', 'abdominal pain', 'stomach ache', 'पेट दर्द', 'पेट में दर्द'] },
  { tag: 'burning_pain', phrases: ['jalan', 'burning', 'जलन'] },
  { tag: 'unconscious', phrases: ['behosh', 'unconscious', 'बेहोश'] },
  { tag: 'seizure', phrases: ['daura', 'mirgi', 'seizure', 'दौरा', 'मिर्गी'] },
  { tag: 'heavy_bleeding', phrases: ['khoon nikal raha', 'bleeding', 'khoon beh raha', 'khoon', 'खून', 'खून बह रहा'] },
  { tag: 'snakebite_scorpion', phrases: ['saamp ne kata', 'bichhu', 'snakebite', 'scorpion', 'सांप', 'बिच्छू'] },
  { tag: 'poisoning', phrases: ['zehar', 'poison', 'ज़हर', 'जहर'] },
  { tag: 'palpitations', phrases: ['ghabrahat', 'dhadkan', 'palpitations', 'घबराहट', 'धड़कन'] },
  { tag: 'hunger_weakness', phrases: ['kamzori', 'weakness', 'कमजोरी'] },
];

export function normalizeText(text: string): string {
  let s = text.normalize('NFC').toLowerCase();
  // Remove punctuation and danda
  s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()।॥]/g, '');
  // Normalize nukta forms (e.g. ज़ -> ज, क़ -> क)
  s = s.replace(/ज़/g, 'ज').replace(/क़/g, 'क').replace(/फ़/g, 'फ').replace(/ख़/g, 'ख').replace(/ग़/g, 'ग');
  // Collapse spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  
  // Hindi numbers to digits (basic)
  const nums: Record<string, string> = {
    'ek': '1', 'do': '2', 'teen': '3', 'char': '4', 'paanch': '5', 'chhe': '6', 'saat': '7', 'aath': '8', 'nau': '9', 'das': '10',
    'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  Object.keys(nums).forEach(k => {
    s = s.replace(new RegExp(`\\b${k}\\b`, 'g'), nums[k]);
  });
  return s;
}

export function parseDuration(text: string): string | null {
  const norm = normalizeText(text);
  if (norm.includes('ek hafte') || norm.includes('7 din') || norm.includes('1 week')) return '4-7 days';
  if (norm.includes('teen din') || norm.includes('do din') || norm.includes('3 din') || norm.includes('2 din')) return '1-3 days';
  if (norm.includes('do ghante') || norm.includes('2 ghante') || norm.includes('ek ghante')) return '1-6 h';
  return null;
}

export function matchLexicon(transcript: string) {
  const norm = normalizeText(transcript);
  const _words = norm.split(' '); // For boundary checking (reserved for future use)
  const matches: { tag: string, phrase: string }[] = [];
  
  // Sort phrases by length (longest first) across all tags
  const allPhrases = LEXICON.flatMap(l => l.phrases.map(p => ({ tag: l.tag, phrase: normalizeText(p) })));
  allPhrases.sort((a, b) => b.phrase.length - a.phrase.length);

  for (const { tag, phrase } of allPhrases) {
    if (norm.includes(phrase)) {
      // Check boundaries if it's alphanumeric (English/Roman)
      const isDevanagari = /[\u0900-\u097F]/.test(phrase);
      if (isDevanagari) {
        matches.push({ tag, phrase });
      } else {
        const regex = new RegExp(`\\b${phrase}\\b`);
        if (regex.test(norm)) matches.push({ tag, phrase });
      }
    }
  }

  // Deduplicate tags, keeping the longest matching phrase
  const uniqueMatches = [];
  const seen = new Set();
  for (const m of matches) {
    if (!seen.has(m.tag)) {
      seen.add(m.tag);
      uniqueMatches.push(m);
    }
  }

  return uniqueMatches;
}
