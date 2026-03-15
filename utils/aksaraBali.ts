export const officialPhrases: Record<string, string> = {
  'dinas': 'ᬤᬶᬦᬲ᭄',
  'pendidikan': 'ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄',
  'kepemudaan': 'ᬓᭂᬧᭂᬫᬸᬤᬵᬦ᭄',
  'dan': 'ᬤᬦ᭄',
  'olahraga': 'ᬳᭀᬮᬄᬭᬕ',
  'kota': 'ᬓᭀᬢ',
  'denpasar': 'ᬤᬾᬦ᭄ᬧᬲᬃ',
  'bali': 'ᬩᬮᬶ',
  'simbar': 'ᬲᬶᬫ᭄ᬩᬃ',
};

export const pepetCorrections: Record<string, string> = {
  'pendidikan': 'pĕndidikan',
  'kepemudaan': 'kĕpĕmudaan',
  'denpasar': 'dénpasar',
  'sekolah': 'sĕkolah',
  'menengah': 'mĕnĕngah',
  'pertama': 'pĕrtama',
  'negeri': 'nĕgĕri',
  'pemerintah': 'pĕmĕrintah',
  'kementerian': 'kĕmĕntĕrian',
  'departemen': 'dĕpartĕmĕn',
  'kebudayaan': 'kĕbudayaan',
  'desa': 'désa',
  'kecamatan': 'kĕcamatan',
  'kabupaten': 'kabupatén',
  'provinsi': 'provinsi',
  'jalan': 'jalan',
  'telepon': 'tĕlĕpon',
  'telp': 'tĕlp',
  'fax': 'fax',
  'email': 'email',
  'website': 'website',
  'kode': 'kodĕ',
  'pos': 'pos',
  'nomor': 'nomor',
  'no': 'no',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  'a': 'ᬅ', 'i': 'ᬇ', 'u': 'ᬉ', 'é': 'ᬏ', 'e': 'ᬏ', 'ĕ': 'ᬅ', 'o': 'ᬑ',
  'ai': 'ᬐ', 'au': 'ᬒ'
};

const CONSONANTS: Record<string, string> = {
  'h': 'ᬳ', 'n': 'ᬦ', 'c': 'ᬘ', 'r': 'ᬭ', 'k': 'ᬓ',
  'd': 'ᬤ', 't': 'ᬢ', 's': 'ᬲ', 'w': 'ᬯ', 'l': 'ᬮ',
  'm': 'ᬫ', 'g': 'ᬕ', 'b': 'ᬩ', 'ng': 'ᬗ', 'p': 'ᬧ',
  'j': 'ᬚ', 'y': 'ᬬ', 'ny': 'ᬜ',
  'f': 'ᬧ᬴', 'v': 'ᬯ᬴', 'z': 'ᬚ᬴', 'x': 'ᬓ᭄ᬲ', 'q': 'ᬓ'
};

const VOWEL_DIACRITICS: Record<string, string> = {
  'a': '',
  'i': 'ᬶ',
  'u': 'ᬸ',
  'é': 'ᬾ',
  'e': 'ᬾ',
  'ĕ': 'ᭂ',
  'o': 'ᭀ',
  'ai': 'ᬿ',
  'au': 'ᭁ'
};

const FINALS: Record<string, string> = {
  'ng': 'ᬂ',
  'r': 'ᬃ',
  'h': 'ᬄ'
};

const ADEG_ADEG = '᭄';

const BALINESE_NUMBERS_PUNCTUATION: Record<string, string> = {
  '0': '᭐', '1': '᭑', '2': '᭒', '3': '᭓', '4': '᭔',
  '5': '᭕', '6': '᭖', '7': '᭗', '8': '᭘', '9': '᭙',
  '.': '᭟', ',': '᭞', '-': '-', ':': '᭝', '?': '?', '!': '!'
};

function _transliterateWord(word: string): string {
  let result = '';
  let i = 0;
  let isFirstSyllable = true;

  while (i < word.length) {
    let currentConsonant = '';
    let currentVowel = '';

    if (i + 1 < word.length && CONSONANTS[word.substring(i, i + 2)]) {
      currentConsonant = word.substring(i, i + 2);
      i += 2;
    } else if (CONSONANTS[word[i]]) {
      currentConsonant = word[i];
      i++;
    }

    if (i + 1 < word.length && VOWEL_DIACRITICS[word.substring(i, i + 2)] !== undefined) {
      currentVowel = word.substring(i, i + 2);
      i += 2;
    } else if (i < word.length && VOWEL_DIACRITICS[word[i]] !== undefined) {
      currentVowel = word[i];
      i++;
    }

    if (!currentConsonant && currentVowel) {
      if (isFirstSyllable) {
        result += INDEPENDENT_VOWELS[currentVowel] || ('ᬳ' + VOWEL_DIACRITICS[currentVowel]);
      } else {
        result += 'ᬳ' + VOWEL_DIACRITICS[currentVowel];
      }
    } else if (currentConsonant) {
      if (currentConsonant === 'n' && i < word.length && word[i] === 'c') {
        result += 'ᬜ᭄';
      } else if (currentConsonant === 'n' && i < word.length && word[i] === 'j') {
        result += 'ᬜ᭄';
      } else if (currentConsonant === 'd' && i + 1 < word.length && word.substring(i, i + 2) === 'ny') {
        result += 'ᬚ᭄';
      } else if (currentVowel === '') {
        if (i < word.length && CONSONANTS[word[i]]) {
          if (currentConsonant === 'r') {
            result += FINALS['r'];
          } else if (currentConsonant === 'ng') {
            result += FINALS['ng'];
          } else if (currentConsonant === 'h') {
            result += FINALS['h'];
          } else {
            result += CONSONANTS[currentConsonant] + ADEG_ADEG;
          }
        } else if (i === word.length) {
          if (FINALS[currentConsonant]) {
            result += FINALS[currentConsonant];
          } else {
            result += CONSONANTS[currentConsonant] + ADEG_ADEG;
          }
        } else {
           result += CONSONANTS[currentConsonant] + ADEG_ADEG;
        }
      } else {
        if (currentVowel === 'i' && i < word.length && word[i] === 'a') {
          result += CONSONANTS[currentConsonant] + VOWEL_DIACRITICS['i'] + 'ᬬ';
          i++;
        } else if (currentVowel === 'u' && i < word.length && word[i] === 'a') {
          result += CONSONANTS[currentConsonant] + VOWEL_DIACRITICS['u'] + 'ᬯ';
          i++;
        } else {
          result += CONSONANTS[currentConsonant] + VOWEL_DIACRITICS[currentVowel];
        }
      }
    } else {
      result += word[i];
      i++;
    }
    isFirstSyllable = false;
  }

  result = result.replace(/ᬂᬳ/g, 'ᬗ᭄ᬳ');
  result = result.replace(/ᬃᬳ/g, 'ᬭ᭄ᬳ');
  result = result.replace(/ᬄᬳ/g, 'ᬳ᭄ᬳ');

  result = result.replace(/᭄ᬬ/g, '᭄ᬬ');
  result = result.replace(/᭄ᬭ/g, '᭄ᬭ');
  result = result.replace(/᭄ᬯ/g, '᭄ᬯ');

  return result;
}

export function transliterate(text: string): string {
  if (!text) return '';

  const parts = text.split(/([\s\n.,\-:?!]+)/);
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (/^[\s\n.,\-:?!]+$/.test(part)) {
      let punctResult = '';
      for (const char of part) {
        punctResult += BALINESE_NUMBERS_PUNCTUATION[char] || char;
      }
      result += punctResult;
      continue;
    }

    let lowerPart = part.toLowerCase();

    if (officialPhrases[lowerPart]) {
      result += officialPhrases[lowerPart];
      continue;
    }

    if (pepetCorrections[lowerPart]) {
      lowerPart = pepetCorrections[lowerPart];
    } else {
      lowerPart = lowerPart.replace(/e/g, 'é');
    }

    if (/^[0-9]+$/.test(lowerPart)) {
      let numResult = '';
      for (const char of lowerPart) {
        numResult += BALINESE_NUMBERS_PUNCTUATION[char] || char;
      }
      result += numResult;
      continue;
    }

    result += _transliterateWord(lowerPart);
  }

  return result;
}
