export type ThemeId = 'midnight' | 'light' | 'navy' | 'emerald' | 'purple' | 'amber';

export type DimensionMode = '2d' | '3d';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameTe: string;
  description: string;
  descriptionTe: string;
  accentColor: string;
  isDark: boolean;
  preview: {
    bg: string;
    surface: string;
    card: string;
    accent: string;
    border: string;
    text: string;
  };
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: 'midnight',
    name: 'Midnight OLED',
    nameTe: 'మిడ్‌నైట్ డార్క్ (OLED Black)',
    description: 'Deep high-contrast pitch black with electric iOS blue accents',
    descriptionTe: 'గాఢమైన పిచ్ బ్లాక్ మరియు ఎలక్ట్రిక్ బ్లూ థీమ్',
    accentColor: '#0a84ff',
    isDark: true,
    preview: {
      bg: '#000000',
      surface: '#121214',
      card: '#1c1c1e',
      accent: '#0a84ff',
      border: 'rgba(255, 255, 255, 0.15)',
      text: '#f4f4f5',
    },
  },
  {
    id: 'amber',
    name: 'Amber Sunset',
    nameTe: 'సన్‌సెట్ అంబర్ (Warm Charcoal)',
    description: 'Warm obsidian espresso charcoal with glowing gold & bronze accents',
    descriptionTe: 'గోల్డ్ & బ్రాంజ్ కాంతులతో వెచ్చని ఎస్ప్రెస్సో చార్‌కోల్ థీమ్',
    accentColor: '#f59e0b',
    isDark: true,
    preview: {
      bg: '#140d06',
      surface: '#1e140b',
      card: '#2b1c10',
      accent: '#f59e0b',
      border: 'rgba(251, 191, 36, 0.25)',
      text: '#fffbeb',
    },
  },
  {
    id: 'purple',
    name: 'Royal Amethyst',
    nameTe: 'రాయల్ అమెథిస్ట్ (Purple Luxury)',
    description: 'Sophisticated deep obsidian violet with vibrant purple & lavender accents',
    descriptionTe: 'ఆధునిక వైలెట్ మరియు రాయల్ పర్పుల్ లగ్జరీ థీమ్',
    accentColor: '#a855f7',
    isDark: true,
    preview: {
      bg: '#0d061c',
      surface: '#170c30',
      card: '#221345',
      accent: '#a855f7',
      border: 'rgba(192, 132, 252, 0.25)',
      text: '#faf5ff',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Ledger',
    nameTe: 'ఎమరాల్డ్ లెడ్జర్ (Excel & Accounting)',
    description: 'Spreadsheet-inspired deep forest emerald for accounting & financial registers',
    descriptionTe: 'ఎక్సెల్ & ఫైనాన్స్ లెడ్జర్ల కోసం డీప్ ఎమరాల్డ్ గ్రీన్ థీమ్',
    accentColor: '#10b981',
    isDark: true,
    preview: {
      bg: '#03140e',
      surface: '#092118',
      card: '#0e3124',
      accent: '#10b981',
      border: 'rgba(52, 211, 153, 0.25)',
      text: '#ecfdf5',
    },
  },
  {
    id: 'navy',
    name: 'Navy Slate',
    nameTe: 'నేవీ స్లేట్ (Govt & Institutional)',
    description: 'Prestigious institutional deep oceanic navy with sky blue & gold accents',
    descriptionTe: 'ప్రభుత్వ మరియు అధికారిక సంస్థల కోసం డీప్ నేవీ బ్లూ థీమ్',
    accentColor: '#38bdf8',
    isDark: true,
    preview: {
      bg: '#080e1e',
      surface: '#0f1833',
      card: '#15244b',
      accent: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.25)',
      text: '#f0f9ff',
    },
  },
  {
    id: 'light',
    name: 'Executive Light',
    nameTe: 'ఎగ్జిక్యూటివ్ లైట్ (Office White)',
    description: 'Crisp clean daylight office white with slate borders & royal blue accents',
    descriptionTe: 'డేలైట్ మరియు ఆఫీస్ కోసం పరిశుభ్రమైన వైట్ & స్లేట్ థీమ్',
    accentColor: '#2563eb',
    isDark: false,
    preview: {
      bg: '#f8fafc',
      surface: '#ffffff',
      card: '#ffffff',
      accent: '#2563eb',
      border: 'rgba(0, 0, 0, 0.12)',
      text: '#0f172a',
    },
  },
];

