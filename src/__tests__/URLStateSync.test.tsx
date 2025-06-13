import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAppStore, DEFAULT_YEAR, MIN_YEAR, MAX_YEAR } from '../store/store';
import URLStateSync from '../routing/URLStateSync';
import type { FlowFeature } from '../data/data.worker'; // For mockFlowFeatures

// Mock useFlowData
const mockFlowFeatures: FlowFeature[] = [
  { id: 'section1', geometry: { type: 'Point', coordinates: [0,0]}, properties: { name: 'Section 1', type: 'weir', flows: {} } },
  { id: 'section2', geometry: { type: 'Point', coordinates: [0,0]}, properties: { name: 'Section 2', type: 'weir', flows: {} } },
];
vi.mock('../hooks/useFlowData', () => ({
  useFlowData: vi.fn(() => ({
    data: mockFlowFeatures, // Provide mock data for section ID validation
    isLoading: false,
    error: null,
  })),
}));

// Mock window.history.replaceState
const mockReplaceState = vi.fn();
const originalReplaceState = window.history.replaceState;
const originalLocation = window.location;

describe('URLStateSync Component', () => {
  const initialStoreState = useAppStore.getState();

  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useAppStore.setState(initialStoreState, true);
    });

    // Mock and setup window.location and window.history
    // Vitest/JSDOM doesn't fully implement location/history interaction, so we manage hash manually.
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, hash: '' }, // Start with empty hash
    });
    window.history.replaceState = mockReplaceState;

    mockReplaceState.mockClear();
    vi.clearAllMocks(); // Clear all mocks including useFlowData if needed
  });

  afterEach(() => {
    // Restore original objects
    window.history.replaceState = originalReplaceState;
    Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
    });
  });

  // Helper to render the component
  const renderComponent = () => {
    return render(<URLStateSync />);
  };

  describe('URL Hash to Store Synchronization (on mount)', () => {
    it('should update selectedYear from URL hash "#/year/YYYY" on mount', () => {
      const testYear = String(MIN_YEAR + 5);
      window.location.hash = `#/year/${testYear}`;
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(testYear);
    });

    it('should update selectedSectionId from URL hash "#/section/ID" on mount', () => {
      const testSectionId = 'section1';
      window.location.hash = `#/section/${testSectionId}`;
      renderComponent();
      expect(useAppStore.getState().selectedSectionId).toBe(testSectionId);
    });

    it('should update year and sectionId from URL hash "#/section/ID/year/YYYY" on mount', () => {
      const testYear = '2005';
      const testSectionId = 'section2';
      window.location.hash = `#/section/${testSectionId}/year/${testYear}`;
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(testYear);
      expect(useAppStore.getState().selectedSectionId).toBe(testSectionId);
      // Also check order doesn't matter for parsing
      window.location.hash = `#/year/${testYear}/section/${testSectionId}`;
      act(() => { useAppStore.setState(initialStoreState, true); }); // Reset store
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(testYear);
      expect(useAppStore.getState().selectedSectionId).toBe(testSectionId);
    });

    it('should not update store if year in hash is invalid or out of range, and warn', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidYear = String(MIN_YEAR - 10);
      window.location.hash = `#/year/${invalidYear}`;
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(DEFAULT_YEAR);
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Invalid year in URL hash: ${invalidYear}. Ignoring.`);
      consoleWarnSpy.mockRestore();
    });

    it('should warn and not update store if sectionId in hash is not in flowFeatures', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidSectionId = 'invalid_section';
      window.location.hash = `#/section/${invalidSectionId}`;
      renderComponent();
      expect(useAppStore.getState().selectedSectionId).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Invalid section ID in URL hash or not found in loaded data: ${invalidSectionId}. Ignoring.`);
      consoleWarnSpy.mockRestore();
    });

    it('should default to DEFAULT_YEAR if "year" key is missing or malformed in hash', () => {
      window.location.hash = '#/year/'; // Malformed
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(DEFAULT_YEAR);

      act(() => { useAppStore.setState(initialStoreState, true); });
      window.location.hash = '#/section/section1'; // Year missing
      renderComponent();
      expect(useAppStore.getState().selectedYear).toBe(DEFAULT_YEAR);
    });

    it('should set sectionId to null if "section" key is missing or malformed in hash', () => {
      window.location.hash = '#/section/'; // Malformed
      renderComponent();
      expect(useAppStore.getState().selectedSectionId).toBeNull();

      act(() => { useAppStore.setState(initialStoreState, true); });
      window.location.hash = '#/year/2000'; // Section missing
      renderComponent();
      expect(useAppStore.getState().selectedSectionId).toBeNull();
    });
  });

  describe('Store to URL Hash Synchronization', () => {
    it('should update URL hash when selectedYear changes in store', () => {
      renderComponent(); // Initial render with empty hash, should set default year hash
      mockReplaceState.mockClear(); // Clear calls from initial render

      const testYear = '1999';
      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
      });
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#/year/${testYear}`);
    });

    it('should update URL hash when selectedSectionId changes in store', () => {
      renderComponent();
      mockReplaceState.mockClear();

      const testSectionId = 'section1';
      act(() => {
        useAppStore.getState().setSelectedSectionId(testSectionId);
      });
      // URLStateSync puts section first, then year
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#/section/${testSectionId}/year/${DEFAULT_YEAR}`);
    });

    it('should update URL hash with both parameters when they change', () => {
      renderComponent();
      mockReplaceState.mockClear();

      const testYear = '2010';
      const testSectionId = 'section2';

      act(() => {
        useAppStore.getState().setSelectedYear(testYear);
        // Store updates are batched by Zustand for listeners, but effects might run sequentially.
        // Let's set them one by one to see the final state.
      });
      act(() => {
        useAppStore.getState().setSelectedSectionId(testSectionId);
      });

      expect(mockReplaceState).toHaveBeenLastCalledWith(null, '', `#/section/${testSectionId}/year/${testYear}`);
    });

    it('should remove section from URL hash if selectedSectionId is set to null', () => {
      // Initial store state with a sectionId
      act(() => {
        useAppStore.getState().setSelectedSectionId('section1');
        useAppStore.getState().setSelectedYear('2000');
      });
      renderComponent(); // Render with this state, it will set the hash
      mockReplaceState.mockClear();

      act(() => {
        useAppStore.getState().setSelectedSectionId(null);
      });
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '#/year/2000');
    });

    it('should set hash to "#" if year is default and section is null', () => {
      act(() => {
        useAppStore.getState().setSelectedYear(DEFAULT_YEAR); // Already default but for clarity
        useAppStore.getState().setSelectedSectionId(null); // Already null
      });
      renderComponent();
      // Initial effect might run if current hash is not "#"
      // Let's assume it's initially something else or empty
      window.location.hash = "#/year/1990"; // Make it different from default
      renderComponent(); // Re-render to trigger effect with current store state

      // Or, more directly:
      act(() => {
        useAppStore.getState().setSelectedYear("1990"); // change
      });
       act(() => {
        useAppStore.getState().setSelectedSectionId("section1"); // change
      });
      mockReplaceState.mockClear();

      act(() => {
        useAppStore.getState().setSelectedYear(DEFAULT_YEAR);
      });
      act(() => {
        useAppStore.getState().setSelectedSectionId(null);
      });
      expect(mockReplaceState).toHaveBeenLastCalledWith(null, '', '#');
    });

    it('should not call replaceState if store change results in same hash as current hash', () => {
      const initialYear = '2000';
      act(() => { useAppStore.getState().setSelectedYear(initialYear); });
      window.location.hash = `#/year/${initialYear}`; // Sync window hash with store state

      renderComponent(); // Render. Initial effect should see hash matches store and not call replaceState.
      mockReplaceState.mockClear();

      act(() => {
        useAppStore.getState().setSelectedYear(initialYear); // "Update" to the same value
      });
      expect(mockReplaceState).not.toHaveBeenCalled();
    });
  });

  describe('Initial Load and Preventing Loops', () => {
    it('should parse hash on load, update store, and not immediately push that state back to hash', () => {
      const yearFromHash = '2001';
      const sectionFromHash = 'section1';
      window.location.hash = `#/year/${yearFromHash}/section/${sectionFromHash}`;

      renderComponent();

      // Store should be updated
      expect(useAppStore.getState().selectedYear).toBe(yearFromHash);
      expect(useAppStore.getState().selectedSectionId).toBe(sectionFromHash);

      // replaceState should NOT have been called immediately after parsing,
      // because the effect that writes to hash should be skipped due to hasAppliedInitialHash.current flag.
      expect(mockReplaceState).not.toHaveBeenCalled();
    });

    it('subsequent store change after initial load should update hash', () => {
      const yearFromHash = '2001';
      window.location.hash = `#/year/${yearFromHash}`;
      renderComponent(); // Initial load, parses hash, sets store, should not call replaceState.
      expect(mockReplaceState).not.toHaveBeenCalled();

      // Now, a subsequent change
      const newYear = '2002';
      act(() => {
        useAppStore.getState().setSelectedYear(newYear);
      });
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', `#/year/${newYear}`);
    });
  });
});
