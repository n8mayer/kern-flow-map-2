import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';
import { DataProvider } from '../data/DataProvider'; // Required for React Query context

// Tell Vitest to use the manual mock for useFlowData
// This will pick up src/hooks/__mocks__/useFlowData.ts
vi.mock('../hooks/useFlowData');

// Explicitly mock react-i18next here
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string, options?: any) => {
      if (options && typeof options === 'object' && options.defaultValue) {
        // Simple interpolation for testing, e.g., "Year: {{year}}"
        // or return defaultValue if key not found in simple replacement
        let Atranslated = key;
        let replaced = false;
        for (const interpKey in options) {
          if (interpKey !== 'defaultValue') {
            const regex = new RegExp(`{{${interpKey}}}`, 'g');
            if (Atranslated.match(regex)) {
              Atranslated = Atranslated.replace(regex, options[interpKey]);
              replaced = true;
            }
          }
        }
        // If no interpolation happened but there's a default, use it.
        // Or if you want to strictly use keys unless interpolated:
        // return Atranslated;
        return replaced ? Atranslated : (options.defaultValue || key);
      }
      // Fallback for simple keys or if no defaultValue/interpolation matches
      // Add specific key mappings needed for App.integration.test.tsx
      if (key === 'app.headerTitle') return "Kern River Flow Map";
      if (key === 'timebar.yearAriaLabel') return `Year: ${options?.year || '1995'}`;
      if (key === 'overviewDash.systemOverviewTitle') return "System Overview"; // Key used in h2
      // if (key === 'sectionDash.title') return "Section Details"; // Not used for a static title
      // if (key === 'overviewDash.title') return "Overview Dashboard"; // This was an assumption

      // Original fallbacks from previous mock, adjust if needed
      if (key === 'sectionDash.selectSectionPrompt') return "Select a section on the map to see details.";
      if (key === 'sectionDash.loadingData') return "Loading section data...";

      // A more generic way to handle interpolation for "Year: {{year}}" or similar patterns
      if (options && options.year && key.toLowerCase().includes('year')) {
        return key.replace(/\{\{\s*year\s*\}\}/ig, options.year);
      }


      return key; // Return the key itself as a fallback
    },
    i18n: {
      changeLanguage: vi.fn(() => new Promise(() => {})),
      language: 'en',
      // Add any other i18n properties or methods your components might use
    },
  })),
}));

describe('App Integration Tests', () => {
  it('should render main components successfully', () => {
    render(
      <DataProvider>
        <App />
      </DataProvider>
    );

    // Check for Header content (e.g., part of the title)
    // Note: These texts might need adjustment based on actual content in Header.
    // Using broad matches or test-ids is more robust.
    expect(screen.getByText("Kern River Flow Map")).toBeInTheDocument();

    // Check if MapPane is rendered (MapPane itself doesn't render distinct text without data/state)
    // We can check for an element that MapPane typically renders, or add a test-id.
    // For now, we'll assume its presence if other dependent components are there.
    // A more robust check would be to give MapPane a test-id="map-pane" and use screen.getByTestId.

    // Check for TimeBar (e.g., it might render the default year from the store)
    // The default year is 1995 from the store's initial state.
    // The mock t function will replace 'timebar.yearAriaLabel' with "Year: 1995"
    // We also need to find the element that displays the year itself, which is a <span> with text 1995.
    expect(screen.getByText((content, element) => {
      // Check for span with text "1995" that is likely the year display in TimeBar
      return element?.tagName.toLowerCase() === 'span' && content === '1995' && element.classList.contains('w-20');
    })).toBeInTheDocument();


    // Check for SectionDash (initial state when no section is selected)
    expect(screen.getByText("Select a section on the map to see details.")).toBeInTheDocument();

    // Check for OverviewDash (title)
    // This assumes OverviewDash renders a heading or text that matches "System Overview" via its i18n key 'overviewDash.systemOverviewTitle'
    expect(screen.getByText("System Overview")).toBeInTheDocument();
  });
});
