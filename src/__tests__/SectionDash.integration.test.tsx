import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DataProvider } from '../data/DataProvider';
import { useAppStore, DEFAULT_YEAR } from '../store/store';
import SectionDash from '../components/SectionDash';
import { mockFlowFeatures, setMockUseFlowData } from '../hooks/__mocks__/useFlowData'; // Import mock data and helper

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string, options?: any) => {
      if (key === 'sectionDash.selectSectionPrompt') return "Select a section on the map to see details.";
      if (key === 'sectionDash.loadingData') return "Loading section data...";
      if (key === 'sectionDash.noFlowDataForTrend') return "No flow data for trend.";
      if (key === 'sectionDash.notEnoughDataForDecades') return "Not enough data for decades.";
      if (key === 'sectionDash.noFlowDataAvailable') return "No flow data available.";
      if (key === 'sectionDash.typeLabel') return "Type";
      if (key === 'sectionDash.idLabel') return "ID";
      if (key === 'sectionDash.flowForYearTitle') return `Flow Data for ${options?.year || DEFAULT_YEAR}`;
      if (key === 'sectionDash.comparisonBadgesTitle') return "Comparison Badges";
      if (key === 'sectionDash.badgeLabelVsPrevious') return `vs. Previous Year (${options?.year || 'N/A'})`;
      if (key === 'sectionDash.badgeLabelVsPreviousFromZero') return `vs. Previous Year (${options?.year || 'N/A'}) (was 0)`;
      if (key === 'sectionDash.badgeLabelVsTenYearAvg') return `vs. 10-Year Avg. (${options?.yearRange || 'N/A'})`;
      if (key === 'sectionDash.badgeLabelVsTenYearAvgFromZero') return `vs. 10-Year Avg. (${options?.yearRange || 'N/A'}) (was 0)`;
      if (key === 'sectionDash.noData') return "No Data";
      if (key === 'overviewDash.acreFeetAbbreviation') return "af"; // Used in currentFlowDescription
      if (key === 'sectionDash.flowTrendTitle') return "Flow Trend";
      if (key === 'sectionDash.avgFlowByDecadeTitle') return "Average Flow by Decade";
      return key; // Fallback
    },
    i18n: {
      changeLanguage: vi.fn(() => new Promise(() => {})),
      language: 'en',
    },
  })),
}));

// Mock useFlowData
vi.mock('../hooks/useFlowData');


describe('SectionDash Integration Tests', () => {
  beforeEach(async () => {
    await act(async () => {
      useAppStore.setState(useAppStore.getInitialState(), true);
      // Set default mock data for useFlowData for each test
      setMockUseFlowData(mockFlowFeatures, false, null);
    });
    vi.clearAllMocks();
  });

  const renderIsolatedSectionDash = () => {
    return render(
      <DataProvider>
        <SectionDash />
      </DataProvider>
    );
  };

  it('Scenario 1: Initial Display (No Selection)', () => {
    renderIsolatedSectionDash();
    expect(screen.getByText("Select a section on the map to see details.")).toBeInTheDocument();
  });

  it('Scenario 2: Display Data for Selected Feature & Year', async () => {
    renderIsolatedSectionDash();
    const selectedFeature = mockFlowFeatures[0]; // e.g., Canal Alpha (C1)
    const selectedTestYear = '1995'; // Has data for C1 (100 af)

    await act(async () => {
      useAppStore.getState().setSelectedYear(selectedTestYear);
      useAppStore.getState().setSelectedSectionId(selectedFeature.id);
    });

    // Wait for UI updates if any async operations are involved in data display
    // For SectionDash, it primarily reacts to store changes.
    await screen.findByText(selectedFeature.properties.name); // Wait for name to appear

    expect(screen.getByText(selectedFeature.properties.name)).toBeInTheDocument();
    // For "ID: C1", query more flexibly due to potential whitespace and child spans
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === `ID: ${selectedFeature.id}`;
      const elementHasText = hasText(element);
      // Check if any child also contributes to this text, to ensure it's the parent <p>
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return elementHasText && childrenDontHaveText;
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === `Type: ${selectedFeature.properties.type}`;
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return elementHasText && childrenDontHaveText;
    })).toBeInTheDocument(); // Check for type

    // Check for flow value display - this depends on how SectionDash formats it.
    // Assuming it shows "XXX af in YYYY" or similar from currentFlowDescription
    const expectedFlow = selectedFeature.properties.flows[selectedTestYear];
    expect(screen.getByText(`${expectedFlow.toFixed(2)} af in ${selectedTestYear}`)).toBeInTheDocument();
  });

  it('Scenario 3: Selected Feature with No Flow Data for Selected Year', async () => {
    renderIsolatedSectionDash();
    const selectedFeature = mockFlowFeatures[0]; // C1
    const yearWithNoData = '2010'; // Assume C1 has no data for 2010 in mockFlowFeatures

    await act(async () => {
      useAppStore.getState().setSelectedYear(yearWithNoData);
      useAppStore.getState().setSelectedSectionId(selectedFeature.id);
    });

    await screen.findByText(selectedFeature.properties.name);

    // Check for "No Data for YYYY" or similar
    expect(screen.getByText(`No Data for ${yearWithNoData}`)).toBeInTheDocument();
  });

  it('Scenario 4: Changing Year with Feature Already Selected', async () => {
    renderIsolatedSectionDash();
    const selectedFeature = mockFlowFeatures[1]; // River Beta (R1)
    const initialYear = '1995'; // R1 has 200 af
    const nextYear = '2000';    // R1 has 220 af

    // Initial selection
    await act(async () => {
      useAppStore.getState().setSelectedYear(initialYear);
      useAppStore.getState().setSelectedSectionId(selectedFeature.id);
    });

    await screen.findByText(selectedFeature.properties.name);
    const initialFlow = selectedFeature.properties.flows[initialYear];
    expect(screen.getByText(`${initialFlow.toFixed(2)} af in ${initialYear}`)).toBeInTheDocument();

    // Change year
    await act(async () => {
      useAppStore.getState().setSelectedYear(nextYear);
    });

    // Wait for the specific text to update
    await waitFor(() => {
        const nextFlow = selectedFeature.properties.flows[nextYear];
        expect(screen.getByText(`${nextFlow.toFixed(2)} af in ${nextYear}`)).toBeInTheDocument();
    });
    // Ensure old year's data is not present if the text format is unique enough
    expect(screen.queryByText(`${initialFlow.toFixed(2)} af in ${initialYear}`)).not.toBeInTheDocument();
  });
});
