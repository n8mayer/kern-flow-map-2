import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAppStore, getAvailableYears, MIN_YEAR, MAX_YEAR, DEFAULT_YEAR } from '../store/store';

describe('Zustand Store (useAppStore)', () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    act(() => {
      useAppStore.setState(useAppStore.getInitialState(), true);
    });
  });

  describe('Initial State', () => {
    it('should have selectedYear as DEFAULT_YEAR initially', () => {
      const { selectedYear } = useAppStore.getState();
      expect(selectedYear).toBe(DEFAULT_YEAR);
    });

    it('should have selectedSectionId as null initially', () => {
      const { selectedSectionId } = useAppStore.getState();
      expect(selectedSectionId).toBeNull();
    });
  });

  describe('setSelectedYear action', () => {
    it('should update selectedYear with a valid year', () => {
      const testYear = "2000";
      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
      });
      expect(useAppStore.getState().selectedYear).toBe(testYear);
    });

    it('should not update selectedYear with a year below MIN_YEAR', () => {
      const initialYear = useAppStore.getState().selectedYear;
      const testYear = String(MIN_YEAR - 1); // e.g., "1978" if MIN_YEAR is 1979
      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
      });
      expect(useAppStore.getState().selectedYear).toBe(initialYear);
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempted to set invalid year: ${testYear}`);
      consoleWarnSpy.mockRestore();
    });

    it('should not update selectedYear with a year above MAX_YEAR', () => {
      const initialYear = useAppStore.getState().selectedYear;
      const testYear = String(MAX_YEAR + 1);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
      });
      expect(useAppStore.getState().selectedYear).toBe(initialYear);
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempted to set invalid year: ${testYear}`);
      consoleWarnSpy.mockRestore();
    });

    it('should not update selectedYear with a non-numeric string', () => {
      const initialYear = useAppStore.getState().selectedYear;
      const testYear = "abcd";
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
      });
      expect(useAppStore.getState().selectedYear).toBe(initialYear);
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempted to set invalid year: ${testYear}`);
      consoleWarnSpy.mockRestore();
    });

    it('should reset to DEFAULT_YEAR if setSelectedYear is called with DEFAULT_YEAR', () => {
      act(() => {
        useAppStore.getState().setSelectedYear("2005"); // Change it first
      });
      act(() => {
        useAppStore.getState().setSelectedYear(DEFAULT_YEAR);
      });
      expect(useAppStore.getState().selectedYear).toBe(DEFAULT_YEAR);
    });
  });

  describe('setSelectedSectionId action', () => {
    it('should update selectedSectionId with a string ID', () => {
      const testId = "section123";
      act(() => {
        useAppStore.getState().setSelectedSectionId(testId);
      });
      expect(useAppStore.getState().selectedSectionId).toBe(testId);
    });

    it('should update selectedSectionId with null', () => {
      act(() => {
        useAppStore.getState().setSelectedSectionId("some-id"); // Set it to non-null first
      });
      act(() => {
        useAppStore.getState().setSelectedSectionId(null);
      });
      expect(useAppStore.getState().selectedSectionId).toBeNull();
    });
  });

  describe('getAvailableYears utility', () => {
    const availableYears = getAvailableYears();

    it('should return an array of strings', () => {
      expect(Array.isArray(availableYears)).toBe(true);
      expect(availableYears.every(year => typeof year === 'string')).toBe(true);
    });

    it('should start with MIN_YEAR and end with MAX_YEAR', () => {
      expect(availableYears[0]).toBe(String(MIN_YEAR));
      expect(availableYears[availableYears.length - 1]).toBe(String(MAX_YEAR));
    });

    it('should have the correct number of years', () => {
      expect(availableYears.length).toBe(MAX_YEAR - MIN_YEAR + 1);
    });
  });
});
