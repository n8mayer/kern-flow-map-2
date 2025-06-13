import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend'; // If using http backend to load translations
// Or, if you want to bundle translations directly:
import translationEN from './locales/en/translation.json';

// Option 1: Bundle translations directly (simpler for this context)
const resources = {
  en: {
    translation: translationEN,
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources, // Use this if you bundle translations
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: true, // Set to false in production

    interpolation: {
      escapeValue: false, // react already safes from xss
    },

    // Option 2: Configuration for i18next-http-backend (if loading from public folder)
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to your translation files
    // },
    // react: {
    //   useSuspense: true, // Recommended for new projects
    // }
  });

export default i18n;
