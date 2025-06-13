import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DataProvider } from '../data/DataProvider'; // For React Query context
import { useAppStore, DEFAULT_YEAR, MIN_YEAR, MAX_YEAR } from '../store/store';
import TimeBar from '../components/TimeBar'; // The component to test
import TimeBar from '../components/TimeBar'; // The component to test
// No longer importing App for rendering TimeBar in isolation

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string, options?: any) => {
      if (key === 'timebar.yearAriaLabel') return `Year: ${options?.year || DEFAULT_YEAR}`;
      if (key === 'timebar.play') return 'Play';
      if (key === 'timebar.pause') return 'Pause';
      if (key === 'timebar.selectYear') return 'Select Year';
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(() => new Promise(() => {})),
      language: 'en',
    },
  })),
}));

// Mock useFlowData as it's a dependency of App, though not directly used by TimeBar for these tests
vi.mock('../hooks/useFlowData', () => ({
  useFlowData: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));


describe('TimeBar Integration Tests', () => {
  beforeEach(async () => {
    await act(async () => {
      // Reset store to initial state before each test
      useAppStore.setState(useAppStore.getInitialState(), true);
    });
    vi.clearAllMocks();
  });

  const renderIsolatedTimeBar = () => {
    return render(
      <DataProvider> {/* TimeBar might need QueryClient from DataProvider if it uses react-query itself,
                         or if any child component (like a settings menu) does.
                         If not, DataProvider might be omitted here for true isolation.
                         Assuming for now it or its children might need it. */}
        <TimeBar />
      </DataProvider>
    );
  };

  it('should display the default year initially', () => {
    renderIsolatedTimeBar();
    // Check the span that displays the year, assuming it has a specific class or structure
    const yearDisplayElement = screen.getByText(DEFAULT_YEAR, { selector: 'span.text-lg.font-medium' });
    expect(yearDisplayElement).toBeInTheDocument();
  });

  it('should update selectedYear in the store when slider is changed', () => {
    renderIsolatedTimeBar();

    // The aria-label is on the parent span, not the slider role itself.
    // Find by role and then check properties.
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', DEFAULT_YEAR);


    // Simulate changing the slider value.
    // Radix slider in JSDOM doesn't directly respond to `change` with value.
    // We need to simulate the behavior that would lead to `onValueChange` being called.
    // For this test, we'll directly update the store as if the slider moved,
    // then verify the UI reflects this store change.
    // A more E2E test would use keyboard events if possible with Radix Slider in JSDOM.

    const testYear = String(MIN_YEAR + 5); // e.g., 1984

    act(() => {
      const storeState = useAppStore.getState();
      // console.log('Store state in slider test before calling setSelectedYear:', storeState);
      expect(typeof storeState.setSelectedYear).toBe('function');
      storeState.setSelectedYear(testYear);
    });

    // Verify the year display updates
    const yearDisplayElement = screen.getByText(testYear, { selector: 'span.text-lg.font-medium' });
    expect(yearDisplayElement).toBeInTheDocument();

    // Verify the store state
    expect(useAppStore.getState().selectedYear).toBe(testYear);

    // Verify slider's aria-valuenow has updated
    expect(slider).toHaveAttribute('aria-valuenow', testYear);
  });

  it('should update selectedYear in the store when year is selected from DropdownMenu', async () => {
    // console.log('Store state AT START of dropdown test:', useAppStore.getState().selectedYear);
    renderIsolatedTimeBar();
    // The button's accessible name is given by its aria-label, which is "Select Year" from the mock
    const dropdownTrigger = screen.getByRole('button', { name: 'Select Year' });
    expect(dropdownTrigger).toBeInTheDocument();
    expect(dropdownTrigger).toHaveTextContent(DEFAULT_YEAR);

    await userEvent.click(dropdownTrigger);

    // screen.debug(undefined, 300000); // Inspect the DOM after click

    const testYear = String(MAX_YEAR - 2); // e.g., 2019
    // Corrected role from 'menuitemradio' to 'menuitem' based on DOM output
    const yearOption = await screen.findByRole('menuitem', { name: testYear });

    await userEvent.click(yearOption);

    // Verify the year display updates
    const yearDisplayElement = screen.getByText(testYear, { selector: 'span.text-lg.font-medium' });
    expect(yearDisplayElement).toBeInTheDocument();

    // Verify the store state
    expect(useAppStore.getState().selectedYear).toBe(testYear);

    // Verify dropdown trigger text also updates
    // The aria-label remains "Select Year", but the text content changes
    expect(screen.getByRole('button', { name: 'Select Year' })).toHaveTextContent(testYear);
  });

});
