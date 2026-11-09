/**
 * Comprehensive Telugu Phonetic (RTS/Baraha/ITRANS) Transliteration Utility
 * High-accuracy conversion from English phonetic spelling into Telugu Unicode script
 */

// Independent Vowels (అచ్చులు)
export const TELUGU_VOWELS: Record<string, string> = {
  'aa': 'ఆ',
  'A': 'ఆ',
  'a': 'అ',
  'ii': 'ఈ',
  'ee': 'ఈ',
  'I': 'ఈ',
  'i': 'ఇ',
  'uu': 'ఊ',
  'oo': 'ఊ',
  'U': 'ఊ',
  'u': 'ఉ',
  'Ru': 'ఋ',
  'RU': 'ౠ',
  'R': 'ఋ',
  'ai': 'ఐ',
  'e': 'ఎ',
  'E': 'ఏ',
  'ae': 'ఏ',
  'au': 'ఔ',
  'ou': 'ఔ',
  'o': 'ఒ',
  'O': 'ఓ',
  'oe': 'ఓ',
  'am': 'అం',
  'M': 'అం',
  'ah': 'అః',
  'H': 'అః',
};

// Dependent Vowel Signs (గుణింతాలు / మాత్రలు)
export const TELUGU_MATRAS: Record<string, string> = {
  'aa': 'ా',
  'A': 'ా',
  'a': '', // inherent vowel
  'ii': 'ీ',
  'ee': 'ీ',
  'I': 'ీ',
  'i': 'ి',
  'uu': 'ూ',
  'oo': 'ూ',
  'U': 'ూ',
  'u': 'ు',
  'Ru': 'ృ',
  'RU': 'ౄ',
  'R': 'ృ',
  'ai': 'ై',
  'e': 'ె',
  'E': 'ే',
  'ae': 'ే',
  'au': 'ౌ',
  'ou': 'ౌ',
  'o': 'ొ',
  'O': 'ో',
  'oe': 'ో',
  'am': 'ం',
  'M': 'ం',
  'ah': 'ః',
  'H': 'ః',
};

// Consonants with Virama (హల్లులు + పొల్లు)
export const TELUGU_CONSONANTS: Record<string, string> = {
  'ksha': 'క్ష',
  'kshi': 'క్షి',
  'kshu': 'క్షు',
  'ksh': 'క్ష్',
  'kh': 'ఖ్',
  'k': 'క్',
  'gh': 'ఘ్',
  'g': 'గ్',
  'G': 'ఙ్',
  'chh': 'ఛ్',
  'ch': 'చ్',
  'Ch': 'ఛ్',
  'c': 'చ్',
  'jh': 'ఝ్',
  'j': 'జ్',
  'J': 'ఞ్',
  'Th': 'ఠ్',
  'T': 'ట్',
  'Dh': 'ఢ్',
  'D': 'డ్',
  'N': 'ణ్',
  'th': 'థ్',
  't': 'త్',
  'dh': 'ధ్',
  'd': 'ద్',
  'n': 'న్',
  'ph': 'ఫ్',
  'p': 'ప్',
  'f': 'ఫ్',
  'bh': 'భ్',
  'b': 'బ్',
  'm': 'మ్',
  'y': 'య్',
  'r': 'ర్',
  'l': 'ల్',
  'v': 'వ్',
  'w': 'వ్',
  'sh': 'శ్',
  'Sh': 'ష్',
  'S': 'ష్',
  's': 'స్',
  'h': 'హ్',
  'L': 'ళ్',
  'R': 'ఱ్',
};

// Telugu Digits (౦ - ౯)
export const TELUGU_DIGITS: Record<string, string> = {
  '0': '౦',
  '1': '౧',
  '2': '౨',
  '3': '౩',
  '4': '౪',
  '5': '౫',
  '6': '౬',
  '7': '౭',
  '8': '౮',
  '9': '౯',
};

// Common word dictionary for instant accurate spelling
export const COMMON_TELUGU_WORDS: Record<string, string> = {
  'namaste': 'నమస్తే',
  'namaskaram': 'నమస్కారం',
  'dhanyavadalu': 'ధన్యవాదాలు',
  'swagatam': 'స్వాగతం',
  'telugu': 'తెలుగు',
  'bharat': 'భారత్',
  'bharatam': 'భారతం',
  'andhra': 'ఆంధ్ర',
  'pradesh': 'ప్రదేశ్',
  'hyderabad': 'హైదరాబాద్',
  'amaravati': 'అమరావతి',
  'vidya': 'విద్య',
  'vidyarthi': 'విద్యార్థి',
  'vidyarthulu': 'విద్యార్థులు',
  'school': 'స్కూల్',
  'college': 'కాలేజ్',
  'teacher': 'ఉపాధ్యాయులు',
  'class': 'తరగతి',
  'roll': 'రోల్',
  'number': 'నెంబర్',
  'name': 'పేరు',
  'phone': 'ఫోన్',
  'address': 'చిరునామా',
  'date': 'తేదీ',
  'fee': 'ఫీజు',
  'attendance': 'హాజరు',
  'present': 'హాజరు',
  'absent': 'గైర్హాజరు',
  'male': 'పురుషుడు',
  'female': 'స్త్రీ',
  'yes': 'అవును',
  'no': 'కాదు',
  'pass': 'ఉత్తీర్ణత',
  'fail': 'ఫెయిల్',
  'marks': 'మార్కులు',
  'grade': 'గ్రేడ్',
  'sathish': 'సతీష్',
  'kumar': 'కుమార్',
  'guduru': 'గూడూరు',
  'newgen': 'న్యూజెన్',
  'education': 'ఎడ్యుకేషన్',
};

// Sorted keys for greedy matching (longest prefixes first)
const CONSONANT_KEYS = Object.keys(TELUGU_CONSONANTS).sort((a, b) => b.length - a.length);
const VOWEL_KEYS = Object.keys(TELUGU_MATRAS).sort((a, b) => b.length - a.length);

/**
 * Transliterates an English phonetic word or phrase into Telugu script
 */
export function transliterateWord(word: string): string {
  if (!word) return '';

  const lowerWord = word.toLowerCase();
  if (COMMON_TELUGU_WORDS[lowerWord]) {
    return COMMON_TELUGU_WORDS[lowerWord];
  }

  let result = '';
  let i = 0;
  const n = word.length;

  while (i < n) {
    const char = word[i];

    // Numbers
    if (/[0-9]/.test(char)) {
      result += char;
      i++;
      continue;
    }

    // Punctuation & spaces
    if (!/[a-zA-Z]/.test(char)) {
      result += char;
      i++;
      continue;
    }

    // Try matching a consonant first
    let matchedConsonantKey: string | null = null;
    for (const ck of CONSONANT_KEYS) {
      if (word.startsWith(ck, i)) {
        matchedConsonantKey = ck;
        break;
      }
      // Also check case-insensitive match if upper/lower
      if (word.toLowerCase().startsWith(ck.toLowerCase(), i)) {
        matchedConsonantKey = ck;
        break;
      }
    }

    if (matchedConsonantKey) {
      i += matchedConsonantKey.length;
      const baseWithVirama = TELUGU_CONSONANTS[matchedConsonantKey];

      // Check if followed by a vowel sign
      let matchedVowelKey: string | null = null;
      for (const vk of VOWEL_KEYS) {
        if (word.startsWith(vk, i)) {
          matchedVowelKey = vk;
          break;
        }
        if (word.toLowerCase().startsWith(vk.toLowerCase(), i)) {
          matchedVowelKey = vk;
          break;
        }
      }

      if (matchedVowelKey !== null) {
        i += matchedVowelKey.length;
        const matra = TELUGU_MATRAS[matchedVowelKey];
        // Strip the virama ('్') and append matra
        const baseChar = baseWithVirama.endsWith('్') 
          ? baseWithVirama.slice(0, -1) 
          : baseWithVirama;
        result += baseChar + matra;
      } else {
        // No vowel immediately follows this consonant
        // If at the end of word or followed by space/punctuation, remove virama for default 'a' unless explicit virama
        if (i >= n || !/[a-zA-Z]/.test(word[i])) {
          // If the consonant is 'm', treat as anusvara 'ం' at word end
          if (matchedConsonantKey === 'm') {
            result = result.replace(/్$/, '') + 'ం';
          } else {
            // Keep default consonant sound without virama
            const baseChar = baseWithVirama.endsWith('్') 
              ? baseWithVirama.slice(0, -1) 
              : baseWithVirama;
            result += baseChar;
          }
        } else {
          // Followed by another consonant (conjunct / వత్తు)
          result += baseWithVirama;
        }
      }
      continue;
    }

    // Independent Vowel at start of syllable
    let matchedIndVowelKey: string | null = null;
    for (const vk of Object.keys(TELUGU_VOWELS).sort((a, b) => b.length - a.length)) {
      if (word.startsWith(vk, i) || word.toLowerCase().startsWith(vk.toLowerCase(), i)) {
        matchedIndVowelKey = vk;
        break;
      }
    }

    if (matchedIndVowelKey) {
      result += TELUGU_VOWELS[matchedIndVowelKey];
      i += matchedIndVowelKey.length;
      continue;
    }

    // Fallback: character as-is
    result += word[i];
    i++;
  }

  return result;
}

/**
 * Transliterates entire sentences or blocks of text into Telugu
 */
export function transliterateToTelugu(text: string): string {
  if (!text) return '';

  // Process text line by line and token by token, keeping spacing intact
  return text.replace(/([a-zA-Z0-9]+)/g, (match) => {
    // If pure numbers, keep intact
    if (/^[0-9]+$/.test(match)) return match;
    return transliterateWord(match);
  });
}

/**
 * Telugu Alphabet reference items for on-screen Keypad
 */
export interface TeluguKeyItem {
  telugu: string;
  phonetic: string;
  name?: string;
  category: 'vowel' | 'consonant' | 'matra' | 'digit' | 'phrase';
}

export const VOWELS_LIST: TeluguKeyItem[] = [
  { telugu: 'అ', phonetic: 'a', category: 'vowel' },
  { telugu: 'ఆ', phonetic: 'aa / A', category: 'vowel' },
  { telugu: 'ఇ', phonetic: 'i', category: 'vowel' },
  { telugu: 'ఈ', phonetic: 'ee / ii', category: 'vowel' },
  { telugu: 'ఉ', phonetic: 'u', category: 'vowel' },
  { telugu: 'ఊ', phonetic: 'oo / uu', category: 'vowel' },
  { telugu: 'ఋ', phonetic: 'Ru', category: 'vowel' },
  { telugu: 'ౠ', phonetic: 'RU', category: 'vowel' },
  { telugu: 'ఎ', phonetic: 'e', category: 'vowel' },
  { telugu: 'ఏ', phonetic: 'E / ae', category: 'vowel' },
  { telugu: 'ఐ', phonetic: 'ai', category: 'vowel' },
  { telugu: 'ఒ', phonetic: 'o', category: 'vowel' },
  { telugu: 'ఓ', phonetic: 'O / oe', category: 'vowel' },
  { telugu: 'ఔ', phonetic: 'au / ou', category: 'vowel' },
  { telugu: 'అం', phonetic: 'am', category: 'vowel' },
  { telugu: 'అః', phonetic: 'ah', category: 'vowel' },
];

export const CONSONANTS_LIST: TeluguKeyItem[] = [
  { telugu: 'క', phonetic: 'ka', category: 'consonant' },
  { telugu: 'ఖ', phonetic: 'kha', category: 'consonant' },
  { telugu: 'గ', phonetic: 'ga', category: 'consonant' },
  { telugu: 'ఘ', phonetic: 'gha', category: 'consonant' },
  { telugu: 'ఙ', phonetic: 'Gna', category: 'consonant' },

  { telugu: 'చ', phonetic: 'cha', category: 'consonant' },
  { telugu: 'ఛ', phonetic: 'Chha', category: 'consonant' },
  { telugu: 'జ', phonetic: 'ja', category: 'consonant' },
  { telugu: 'ఝ', phonetic: 'jha', category: 'consonant' },
  { telugu: 'ఞ', phonetic: 'Jna', category: 'consonant' },

  { telugu: 'ట', phonetic: 'Ta', category: 'consonant' },
  { telugu: 'ఠ', phonetic: 'Tha', category: 'consonant' },
  { telugu: 'డ', phonetic: 'Da', category: 'consonant' },
  { telugu: 'ఢ', phonetic: 'Dha', category: 'consonant' },
  { telugu: 'ణ', phonetic: 'Na', category: 'consonant' },

  { telugu: 'త', phonetic: 'ta', category: 'consonant' },
  { telugu: 'థ', phonetic: 'tha', category: 'consonant' },
  { telugu: 'ద', phonetic: 'da', category: 'consonant' },
  { telugu: 'ధ', phonetic: 'dha', category: 'consonant' },
  { telugu: 'న', phonetic: 'na', category: 'consonant' },

  { telugu: 'ప', phonetic: 'pa', category: 'consonant' },
  { telugu: 'ఫ', phonetic: 'pha / fa', category: 'consonant' },
  { telugu: 'బ', phonetic: 'ba', category: 'consonant' },
  { telugu: 'భ', phonetic: 'bha', category: 'consonant' },
  { telugu: 'మ', phonetic: 'ma', category: 'consonant' },

  { telugu: 'య', phonetic: 'ya', category: 'consonant' },
  { telugu: 'ర', phonetic: 'ra', category: 'consonant' },
  { telugu: 'ల', phonetic: 'la', category: 'consonant' },
  { telugu: 'వ', phonetic: 'va / wa', category: 'consonant' },
  { telugu: 'శ', phonetic: 'sha / Sa', category: 'consonant' },
  { telugu: 'ష', phonetic: 'Sha', category: 'consonant' },
  { telugu: 'స', phonetic: 'sa', category: 'consonant' },
  { telugu: 'హ', phonetic: 'ha', category: 'consonant' },
  { telugu: 'ళ', phonetic: 'La', category: 'consonant' },
  { telugu: 'క్ష', phonetic: 'ksha', category: 'consonant' },
  { telugu: 'ఱ', phonetic: 'Rra', category: 'consonant' },
];

export const MATRAS_LIST: TeluguKeyItem[] = [
  { telugu: '్', phonetic: 'pollu (virama)', category: 'matra' },
  { telugu: 'ా', phonetic: 'aa', category: 'matra' },
  { telugu: 'ి', phonetic: 'i', category: 'matra' },
  { telugu: 'ీ', phonetic: 'ee / ii', category: 'matra' },
  { telugu: 'ు', phonetic: 'u', category: 'matra' },
  { telugu: 'ూ', phonetic: 'oo / uu', category: 'matra' },
  { telugu: 'ృ', phonetic: 'Ru', category: 'matra' },
  { telugu: 'ౄ', phonetic: 'RU', category: 'matra' },
  { telugu: 'ె', phonetic: 'e', category: 'matra' },
  { telugu: 'ే', phonetic: 'E / ae', category: 'matra' },
  { telugu: 'ై', phonetic: 'ai', category: 'matra' },
  { telugu: 'ొ', phonetic: 'o', category: 'matra' },
  { telugu: 'ో', phonetic: 'O / oe', category: 'matra' },
  { telugu: 'ౌ', phonetic: 'au / ou', category: 'matra' },
  { telugu: 'ం', phonetic: 'm (sunna)', category: 'matra' },
  { telugu: 'ః', phonetic: 'h (visarga)', category: 'matra' },
];

export const DIGITS_LIST: TeluguKeyItem[] = [
  { telugu: '౦', phonetic: '0', category: 'digit' },
  { telugu: '౧', phonetic: '1', category: 'digit' },
  { telugu: '౨', phonetic: '2', category: 'digit' },
  { telugu: '౩', phonetic: '3', category: 'digit' },
  { telugu: '౪', phonetic: '4', category: 'digit' },
  { telugu: '౫', phonetic: '5', category: 'digit' },
  { telugu: '౬', phonetic: '6', category: 'digit' },
  { telugu: '౭', phonetic: '7', category: 'digit' },
  { telugu: '౮', phonetic: '8', category: 'digit' },
  { telugu: '౯', phonetic: '9', category: 'digit' },
];

export const QUICK_PHRASES: string[] = [
  'నమస్కారం',
  'ధన్యవాదాలు',
  'స్వాగతం',
  'అవును',
  'కాదు',
  'పేరు',
  'విద్యార్థి',
  'పాఠశాల',
  'తరగతి',
  'హాజరు',
  'గైర్హాజరు',
  'ఫీజు',
  'మార్కులు',
  'తేదీ',
  'ఉత్తీర్ణత',
];
