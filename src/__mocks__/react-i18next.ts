import { vi } from 'vitest';

export const useTranslation = vi.fn(() => ({
  t: (key: string, options?: any) => {
    if (options && typeof options === 'object') {
      // Simple interpolation for testing, e.g., "Year: {{year}}"
      let Atranslated = key;
      for (const interpKey in options) {
        Atranslated = Atranslated.replace(`{{${interpKey}}}`, options[interpKey]);
      }
      // Fallback for common default value pattern if no options match
      if (Atranslated === key && options.defaultValue) {
        return options.defaultValue;
      }
      return Atranslated;
    }
    return key; // Return the key itself if no options or simple key
  },
  i18n: {
    changeLanguage: vi.fn(() => new Promise(() => {})),
    language: 'en',
    // Add any other i18n properties or methods your components might use
  },
}));

// If you use Trans component or other specific exports, mock them as well.
// export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
// export const withTranslation = () => (Component: React.ComponentType<any>) => (props: any) => <Component {...props} t={(k: string) => k} />;
// ... etc.
