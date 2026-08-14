import { LanguageOption } from '../types/intake';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'hi-IN', name: 'हिंदी', englishName: 'Hindi', speechSupported: true, textSupported: true },
  { code: 'gu-IN', name: 'ગુજરાતી', englishName: 'Gujarati', speechSupported: true, textSupported: true },
  { code: 'mr-IN', name: 'मराठी', englishName: 'Marathi', speechSupported: true, textSupported: true },
  { code: 'ta-IN', name: 'தமிழ்', englishName: 'Tamil', speechSupported: true, textSupported: true },
  { code: 'te-IN', name: 'తెలుగు', englishName: 'Telugu', speechSupported: true, textSupported: true },
  { code: 'bn-IN', name: 'বাংলা', englishName: 'Bengali', speechSupported: true, textSupported: true },
  { code: 'kn-IN', name: 'ಕನ್ನಡ', englishName: 'Kannada', speechSupported: true, textSupported: true },
  { code: 'ml-IN', name: 'മലയാളം', englishName: 'Malayalam', speechSupported: true, textSupported: true },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', speechSupported: true, textSupported: true },
  { code: 'en-IN', name: 'English (India)', englishName: 'English', speechSupported: true, textSupported: true },
];

export function getLanguageByCode(code: string): LanguageOption {
  return (
    SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || {
      code: 'hi-IN',
      name: 'हिंदी',
      englishName: 'Hindi',
      speechSupported: true,
      textSupported: true,
    }
  );
}
