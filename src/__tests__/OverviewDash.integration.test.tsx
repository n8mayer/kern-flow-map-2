import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DataProvider } from '../data/DataProvider';
import { useAppStore, DEFAULT_YEAR } from '../store/store';
import OverviewDash from '../components/OverviewDash';
import { mockFlowFeatures, setMockUseFlowData } from '../hooks/__mocks__/useFlowData';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string, options?: any) => {
      if (key === 'overviewDash.systemOverviewTitle') return "System Overview";
      if (key === 'overviewDash.kpisForYearTitle') return `Key Performance Indicators for ${options?.year || DEFAULT_YEAR}`;
      if (key === 'overviewDash.totalSystemFlow') return "Total System Flow";
      if (key === 'overviewDash.totalCanalFlow') return "Total Canal Flow";
      if (key === 'overviewDash.percentageIntoCanals') return "% Diverted to Canals";
      if (key === 'overviewDash.acreFeetAbbreviation') return "af";
      if (key === 'overviewDash.noOverviewData') return "No data available for calculations."; // Corrected key
      if (key === 'overviewDash.loadingOverviewData') return "Loading overview data..."; // Corrected key
      if (key === 'overviewDash.chartTitleFlowComparison') return `Flow Comparison for ${options?.year || DEFAULT_YEAR}`;
      if (key === 'overviewDash.chartTitleMonthlyDistribution') return `Monthly Distribution for ${options?.year || DEFAULT_YEAR}`;
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(() => new Promise(() => {})),
      language: 'en',
    },
  })),
}));

// Mock useFlowData
vi.mock('../hooks/useFlowData');

describe('OverviewDash Integration Tests', () => {
  beforeEach(async () => {
    await act(async () => {
      useAppStore.setState(useAppStore.getInitialState(), true);
      setMockUseFlowData(mockFlowFeatures, false, null); // Default to having data
    });
    vi.clearAllMocks();
  });

  const renderIsolatedOverviewDash = () => {
    return render(
      <DataProvider>
        <OverviewDash />
      </DataProvider>
    );
  };

  it('Scenario 1: Initial Display', async () => {
    renderIsolatedOverviewDash();
    expect(screen.getByText("System Overview")).toBeInTheDocument();
    expect(screen.getByText(`Key Performance Indicators for ${DEFAULT_YEAR}`)).toBeInTheDocument();

    // Calculate expected totals for DEFAULT_YEAR (1995) from mockFlowFeatures
    // C1: 100, R1: 200, W1: 50 => Total System: 350. Total Canal: 100 (C1). %: (100/350)*100
    await waitFor(() => {
        expect(screen.getByText("Total System Flow")).toBeInTheDocument();
        expect(screen.getByText("350")).toBeInTheDocument(); // Total for 1995
        expect(screen.getByText("Total Canal Flow")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument(); // C1 for 1995
        expect(screen.getByText("% Diverted to Canals")).toBeInTheDocument();
        expect(screen.getByText("28.6%")).toBeInTheDocument(); // (100 / 350) * 100
    });
  });

  it('Scenario 2: Reaction to Year Change', async () => {
    renderIsolatedOverviewDash();
    const newYear = '2000';
    // For year 2000: C1: 120, R1: 220, W1: 60 => Total System: 400. Total Canal: 120. %: (120/400)*100 = 30%

    await act(async () => {
      useAppStore.getState().setSelectedYear(newYear);
    });

    await waitFor(() => {
        expect(screen.getByText(`Key Performance Indicators for ${newYear}`)).toBeInTheDocument();
        expect(screen.getByText("400")).toBeInTheDocument(); // Total for 2000
        expect(screen.getByText("120")).toBeInTheDocument(); // C1 for 2000
        expect(screen.getByText("30.0%")).toBeInTheDocument();
    });
  });

  it('Scenario 3: Display with No Flow Data', async () => {
    await act(async () => {
      setMockUseFlowData(null, false, null); // No data
    });
    renderIsolatedOverviewDash();

    await waitFor(() => {
        expect(screen.getByText("No data available for calculations.")).toBeInTheDocument();
    });
    // Check that KPI values are not rendered or show 0/N/A
    expect(screen.queryByText("350")).not.toBeInTheDocument();
    expect(screen.queryByText("100")).not.toBeInTheDocument();
    expect(screen.queryByText("28.6%")).not.toBeInTheDocument();
  });

  it('Scenario 4: Display during Loading State', async () => {
    await act(async () => {
      setMockUseFlowData(null, true, null); // Loading state
    });
    renderIsolatedOverviewDash();

    await waitFor(() => {
        expect(screen.getByText("Loading overview data...")).toBeInTheDocument();
    });
  });

});
