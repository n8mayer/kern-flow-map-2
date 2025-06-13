import { create } from 'zustand';

interface AppState {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
}

const MIN_YEAR = 1979;
const MAX_YEAR = 2021;
const DEFAULT_YEAR = '1995';

export const useAppStore = create<AppState>((set) => ({
  selectedYear: DEFAULT_YEAR,
  setSelectedYear: (year) => {
    const numericYear = parseInt(year, 10);
    if (!isNaN(numericYear) && numericYear >= MIN_YEAR && numericYear <= MAX_YEAR) {
      set({ selectedYear: year });
    } else {
      console.warn(`Attempted to set invalid year: ${year}`);
      // Optionally, set to a default or clamp, or do nothing
      // set({ selectedYear: DEFAULT_YEAR });
    }
  },
  selectedSectionId: null,
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
}));

// Function to get available years (useful for dropdowns/sliders)
export const getAvailableYears = (): string[] => {
  const years: string[] = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
    years.push(String(y));
  }
  return years;
};

export { MIN_YEAR, MAX_YEAR, DEFAULT_YEAR }; // Export constants for use in components
