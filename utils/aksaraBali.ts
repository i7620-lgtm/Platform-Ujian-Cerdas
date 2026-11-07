/**
 * Aksara Bali Transliteration Utility & Standard Dictionary
 * Supports Pergub Bali No. 80 Tahun 2018 regarding the usage of Balinese script
 * on official government and educational institution signboards and letterheads.
 */

// Balinese Digits: 0 -> ᭐, 1 -> ᭑, 2 -> ᭒, 3 -> ᭓, 4 -> ᭔, 5 -> ᭕, 6 -> ᭖, 7 -> ᭗, 8 -> ᭘, 9 -> ᭙
const BALINESE_DIGITS: Record<string, string> = {
  '0': '\u1B50',
  '1': '\u1B51',
  '2': '\u1B52',
  '3': '\u1B53',
  '4': '\u1B54',
  '5': '\u1B55',
  '6': '\u1B56',
  '7': '\u1B57',
  '8': '\u1B58',
  '9': '\u1B59',
};

// Known institutional phrases mapped to authentic classical Balinese script typography
const INSTITUTIONAL_DICTIONARY: Record<string, string> = {
  'PEMERINTAH PROVINSI BALI': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬧ᭄ᬭᭀᬧ᬴ᬶᬦ᭄ᬲᬶ ᬩᬮᬶ',
  'PEMERINTAH KOTA DENPASAR': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᭀᬢ ᬤᬾᬦ᭄ᬧᬲᬃ',
  'PEMERINTAH KABUPATEN BADUNG': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬩᬤᬸᬂ',
  'PEMERINTAH KABUPATEN GIANYAR': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬕᬶᬬᬜᬃ',
  'PEMERINTAH KABUPATEN TABANAN': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬢᬩᬦᬦ᭄',
  'PEMERINTAH KABUPATEN BULELENG': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬩᬸᬮᬾᬮᬾᬂ',
  'PEMERINTAH KABUPATEN KLANGKUNG': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬓ᭄ᬮᬸᬂᬓᬸᬂ',
  'PEMERINTAH KABUPATEN KLUNGKUNG': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬓ᭄ᬮᬸᬂᬓᬸᬂ',
  'PEMERINTAH KABUPATEN KARANGASEM': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬓᬭᬗᬲᭂᬫ᭄',
  'PEMERINTAH KABUPATEN BANGLI': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬩᬗ᭄ᬮᬶ',
  'PEMERINTAH KABUPATEN JEMBRANA': 'ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᬩᬸᬧᬢᬾᬦ᭄ ᬚᭂᬫ᭄ᬩ᭄ᬭᬦ',
  'DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA': 'ᬤᬶᬦᬲ᭄ ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ ᬓᭂᬧᭂᬫᬸᬤᬵᬦ᭄ ᤤᬦ᭄ ᬑᬮᬄᬭᬕ',
  'DINAS PENDIDIKAN DAN KEBUDAYAAN': 'ᬤᬶᬦᬲ᭄ ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ ᬤᬦ᭄ ᬓᭂᬩᬸᬤᬬᬵᬦ᭄',
  'DINAS PENDIDIKAN': 'ᬤᬶᬦᬲ᭄ ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄',
  'SEKOLAH DASAR NEGERI 2 PADANGSAMBIAN': 'ᬲᭂᬓᭀᬮᬄ ᬤᬲᬃ ᬦᭂᬕᭂᬭᬶ ᭒ ᬧᬤᬂᬲᬫ᭄ᬩᬶᬬᬦ᭄',
  'SD NEGERI 2 PADANGSAMBIAN': 'ᬲᭂᬓᭀᬮᬄ ᬤᬲᬃ ᬦᭂᬕᭂᬭᬶ ᭒ ᬧᬤᬂᬲᬫ᭄ᬩᬶᬬᬦ᭄',
};

// Consonant base characters (Aksara Wianjana)
const CONSONANTS: Record<string, string> = {
  ng: '\u1B17', // nga
  ny: '\u1B1C', // nya
  ch: '\u1B19', // cha
  c: '\u1B18',  // ca
  j: '\u1B1A',  // ja
  k: '\u1B13',  // ka
  g: '\u1B15',  // ga
  t: '\u1B1E',  // ta
  d: '\u1B24',  // da
  n: '\u1B26',  // na
  p: '\u1B27',  // pa
  b: '\u1B29',  // ba
  m: '\u1B2B',  // ma
  y: '\u1B2C',  // ya
  r: '\u1B2D',  // ra
  l: '\u1B2E',  // la
  w: '\u1B2F',  // wa
  s: '\u1B32',  // sa
  h: '\u1B33',  // ha
  f: '\u1B28',  // pha / fa
  v: '\u1B2F',  // wa / va
  z: '\u1B1A',  // ja / za
  q: '\u1B13',  // ka
  x: '\u1B13\u1B44\u1B32', // k + adeg + sa
};

// Independent Vowels at word beginnings (Aksara Suara)
const INDEPENDENT_VOWELS: Record<string, string> = {
  a: '\u1B05', // akara
  i: '\u1B07', // ikara
  u: '\u1B09', // ukara
  e: '\u1B0F', // ekara
  é: '\u1B0F',
  o: '\u1B11', // okara
};

// Dependent Vowel signs attached to consonants (Pangangge Suara)
const DEPENDENT_VOWELS: Record<string, string> = {
  i: '\u1B36', // ulu
  u: '\u1B38', // suku
  e: '\u1B3E', // taling (e)
  é: '\u1B3E',
  o: '\u1B40', // taleng tedung (o)
  ě: '\u1B42', // pepet (e pepet)
  è: '\u1B3E',
};

// Final consonants (Pangangge Tengenan)
const FINAL_CONSONANTS: Record<string, string> = {
  ng: '\u1B02', // cecek
  r: '\u1B03',  // surang
  h: '\u1B04',  // bisah
};

const ADEG_ADEG = '\u1B44'; // Balinese virama / pangkon

/**
 * Transliterates a single Indonesian / Balinese word into Aksara Bali Unicode.
 */
function transliterateWord(word: string): string {
  if (!word) return '';

  // Check if pure numbers
  if (/^\d+$/.test(word)) {
    return word.split('').map((char) => BALINESE_DIGITS[char] || char).join('');
  }

  const clean = word.toLowerCase();
  let result = '';
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const twoChars = clean.slice(i, i + 2);
    const threeChars = clean.slice(i, i + 3);

    // Check digit
    if (BALINESE_DIGITS[char]) {
      result += BALINESE_DIGITS[char];
      i++;
      continue;
    }

    // Check digraph consonant ('ng', 'ny', 'ch')
    let matchedConsonant = '';
    let consLen = 0;
    if (CONSONANTS[twoChars]) {
      matchedConsonant = twoChars;
      consLen = 2;
    } else if (CONSONANTS[char]) {
      matchedConsonant = char;
      consLen = 1;
    }

    if (matchedConsonant) {
      const nextChar = clean[i + consLen];
      const isEnd = i + consLen >= clean.length;

      // Special case: final consonant at end of word or before another consonant
      if (isEnd && FINAL_CONSONANTS[matchedConsonant]) {
        result += FINAL_CONSONANTS[matchedConsonant];
        i += consLen;
        continue;
      }

      const consBalinese = CONSONANTS[matchedConsonant];

      // If next char is vowel
      if (nextChar && 'aiueoéèě'.includes(nextChar)) {
        if (nextChar === 'a') {
          // Inherent 'a' vowel
          result += consBalinese;
          i += consLen + 1;
        } else {
          // Attached vowel
          const vowelSign = DEPENDENT_VOWELS[nextChar] || '';
          result += consBalinese + vowelSign;
          i += consLen + 1;
        }
      } else {
        // Consonant followed by consonant or end of word
        if (isEnd) {
          result += consBalinese + ADEG_ADEG;
          i += consLen;
        } else {
          // Cluster consonant (gantungan)
          result += consBalinese + ADEG_ADEG;
          i += consLen;
        }
      }
      continue;
    }

    // Independent vowel at start of word or after vowel
    if ('aiueoéèě'.includes(char)) {
      const indepVowel = INDEPENDENT_VOWELS[char] || '\u1B05';
      result += indepVowel;
      i++;
      continue;
    }

    // Punctuation or other characters
    result += char;
    i++;
  }

  return result;
}

/**
 * Transliterates an entire string of Indonesian / Balinese Latin text into Aksara Bali.
 */
export function transliterateToAksaraBali(text: string): string {
  if (!text || !text.trim()) return '';

  const upperTrimmed = text.trim().toUpperCase();

  // Check institutional dictionary exact match
  if (INSTITUTIONAL_DICTIONARY[upperTrimmed]) {
    return INSTITUTIONAL_DICTIONARY[upperTrimmed];
  }

  // Split tokens by space while preserving structure
  const tokens = text.split(/(\s+|[,.:;()/-])/);
  return tokens
    .map((token) => {
      if (/^\s+$/.test(token) || /^[,.:;()/-]+$/.test(token)) {
        return token;
      }
      // Check word dictionary or transliterate
      const upper = token.toUpperCase();
      if (INSTITUTIONAL_DICTIONARY[upper]) {
        return INSTITUTIONAL_DICTIONARY[upper];
      }
      return transliterateWord(token);
    })
    .join('');
}

/**
 * Generates initial default Balinese script strings for a school's profile.
 */
export function generateDefaultKopAksaraBali(profile: {
  regency?: string;
  dinasPendidikan?: string;
  school?: string;
  alamatSekolah?: string;
  teleponSekolah?: string;
}) {
  const regencyText = profile.regency
    ? profile.regency.toUpperCase().startsWith('PEMERINTAH') ||
      profile.regency.toUpperCase().startsWith('KABUPATEN') ||
      profile.regency.toUpperCase().startsWith('KOTA')
      ? profile.regency.toUpperCase().startsWith('PEMERINTAH')
        ? profile.regency.toUpperCase()
        : `PEMERINTAH ${profile.regency.toUpperCase()}`
      : `PEMERINTAH KABUPATEN ${profile.regency.toUpperCase()}`
    : 'PEMERINTAH KOTA DENPASAR';

  const dinasText = profile.dinasPendidikan || 'DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA';
  const schoolText = profile.school || 'SEKOLAH DASAR NEGERI 2 PADANGSAMBIAN';
  
  let alamatText = profile.alamatSekolah || 'Jalan Kebo Iwa Banjar Batuparas';
  if (profile.teleponSekolah) {
    alamatText += `, Telepon: ${profile.teleponSekolah}`;
  }

  return {
    aksaraBaliPemda: transliterateToAksaraBali(regencyText),
    aksaraBaliDinas: transliterateToAksaraBali(dinasText),
    aksaraBaliSekolah: transliterateToAksaraBali(schoolText),
    aksaraBaliAlamat: transliterateToAksaraBali(alamatText),
  };
}

// Backward-compatibility alias for WysiwygEditor
export const transliterate = transliterateToAksaraBali;

