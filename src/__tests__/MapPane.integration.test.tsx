import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DataProvider } from '../data/DataProvider';
import { useAppStore, DEFAULT_YEAR } from '../store/store';
import MapPane from '../components/MapPane';
import { mockFlowFeatures, setMockUseFlowData } from '../hooks/__mocks__/useFlowData';
import * as MapPaneUtils from '../components/MapPane.utils'; // To spy on extracted utils

// Mock react-i18next (minimal, MapPane might not use t directly but children might)
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(() => new Promise(() => {})),
      language: 'en',
    },
  })),
}));

// Mock useFlowData
vi.mock('../hooks/useFlowData');

// Spy on the utility functions
const calculateLineWidthLogicSpy = vi.spyOn(MapPaneUtils, 'calculateLineWidthLogic');
const determineFeatureColorSpy = vi.spyOn(MapPaneUtils, 'determineFeatureColor');


describe('MapPane Integration Tests (Simplified)', () => {
  beforeEach(async () => {
    await act(async () => {
      useAppStore.setState(useAppStore.getInitialState(), true);
      setMockUseFlowData(mockFlowFeatures, false, null); // Default to having data
    });
    vi.clearAllMocks(); // Clears spies and mocks
  });

  const renderIsolatedMapPane = () => {
    // Return the container for querySelector usage
    return render(
      <DataProvider>
        <MapPane />
      </DataProvider>
    );
  };

  it('Scenario 1: Renders without crashing with default data', () => {
    const { container } = renderIsolatedMapPane();
    // Check for a known element rendered by MapPane or DeckGL using its ID
    expect(container.querySelector('#deckgl-wrapper')).toBeInTheDocument();
  });

  it('Scenario 2: Re-evaluates layer props on selectedYear change', async () => {
    renderIsolatedMapPane();

    // Wait for initial layer calculation
    await waitFor(() => {
      expect(calculateLineWidthLogicSpy).toHaveBeenCalled();
      expect(determineFeatureColorSpy).toHaveBeenCalled();
    });

    calculateLineWidthLogicSpy.mockClear();
    determineFeatureColorSpy.mockClear();

    const newYear = '2000';
    await act(async () => {
      useAppStore.getState().setSelectedYear(newYear);
    });

    // Check if the utility functions (used in layer prop calculation) are called again
    await waitFor(() => {
      expect(calculateLineWidthLogicSpy).toHaveBeenCalled();
      expect(determineFeatureColorSpy).toHaveBeenCalled();
    });
  });

  it('Scenario 3: Re-evaluates layer props on selectedSectionId change', async () => {
    renderIsolatedMapPane();
    await waitFor(() => {
        expect(calculateLineWidthLogicSpy).toHaveBeenCalled();
        expect(determineFeatureColorSpy).toHaveBeenCalled();
    });

    calculateLineWidthLogicSpy.mockClear();
    determineFeatureColorSpy.mockClear();

    const testSectionId = mockFlowFeatures[0].id; // Select the first feature
    await act(async () => {
      useAppStore.getState().setSelectedSectionId(testSectionId);
    });

    await waitFor(() => {
        expect(calculateLineWidthLogicSpy).toHaveBeenCalled();
        expect(determineFeatureColorSpy).toHaveBeenCalled();
    });
  });

  // Note: Direct testing of Deck.gl onClick/onHover events and visual changes
  // on the map canvas is beyond the scope of RTL and JSDOM.
  // Those are better suited for E2E tests with tools like Playwright or Cypress.
});
