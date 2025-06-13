# Work Log - Kern Flow Dashboard

This document tracks the plan and progress for building the Kern Flow dashboard.

## Plan

1. **Set up the basic application structure**:
    - Create `src` directory.
    - Create `App.tsx` in `src` with basic layout structure (Header, MapPane, SectionDash, OverviewDash, TimeBar).
    - Create placeholder files for `MapPane.tsx`, `SectionDash.tsx`, `OverviewDash.tsx`, `TimeBar.tsx` in `src/components` directory.
    - Create `DataProvider.tsx` in `src/data` directory.
    - Create `store.ts` in `src/store` for Zustand.
    - Update `index.html` to include a root element for the React app.
    - Update `main.tsx` (or create if it doesn't exist) to render the `App` component.
2. **Implement the DataProvider**:
    - Create a Web Worker (`data.worker.ts`) to fetch and parse CSV and shapefile data.
    - Use `shapefile-js` to parse shapefiles.
    - Use `papaparse` to parse CSV data.
    - Join the data based on `MapID` and transform it into the specified `features[]` structure.
    - In `DataProvider.tsx`, use TanStack Query to manage the fetched data.
    - Expose hooks for components to access the data.
3. **Implement the MapPane component**:
    - Initialize MapLibre GL JS for the base map.
    - Use deck.gl `LineLayer` to render river and canal lines.
    - Implement visual encoding rules for line color, width, and opacity based on flow rate.
    - Add persistent text labels at the midpoints of lines.
    - Implement click and hover interactions on lines to update `selectedSectionId` and display tooltips.
    - Ensure the map pane adjusts its size based on viewport dimensions.
4. **Implement the TimeBar component**:
    - Create a slider and a dropdown menu for year selection.
    - Implement play/pause functionality for animating the year.
    - Ensure the component updates the global `selectedYear` state.
    - Style with Tailwind CSS and Radix UI.
5. **Implement the SectionDash component**:
    - Subscribe to `selectedSectionId` and `selectedYear` from the global store.
    - Fetch and display data for the selected section.
    - Render a sparkline chart (1979-2021) using Vega-Lite.
    - Display average flow by decade using bar charts (Vega-Lite).
    - Show percentage change badges.
6. **Implement the OverviewDash component**:
    - Subscribe to `selectedYear` from the global store.
    - Calculate and display KPI grid for the chosen year (e.g., total flow, % into canals).
    - Render small multiple charts over time using Vega-Lite.
7. **Implement global state management (Zustand)**:
    - Define the store in `store.ts` with `selectedSectionId` and `selectedYear`.
    - Provide actions to update these state variables.
    - Connect components that need access to this global state.
8. **Implement routing**:
    - Use a library like `react-router-dom` if needed, or manually manage URL hash.
    - Update URL hash when `selectedSectionId` or `selectedYear` changes.
    - Parse URL hash on initial load to set the initial state.
9. **Style the application**:
    - Apply Tailwind CSS classes to all components for layout and styling.
    - Use Radix UI components where specified (Dropdown, Slider, Tooltip).
    - Ensure the application adheres to the visual design specified in the issue.
10. **Address non-functional requirements**:
    - Implement internationalization using `en.json` and ensure no hardcoded strings.
    - Set up Vite PWA plugin for offline support if straightforward.
    - Test for performance (initial load, animation FPS) and optimize if necessary.
    - Ensure WCAG 2.2 AA accessibility (keyboard navigation, contrast).
11. **Add tests**:
    - Write unit tests for critical components like `DataProvider`, `TimeBar`, and chart components.
    - Test data transformation logic.
    - Test state management and interactions.
12. **Submit the change**:
    - Submit the change with a commit message that describes the changes made.

## Progress

### Step 1: Set up the basic application structure
- [x] Create `src` directory.
- [x] Create `App.tsx` in `src` with basic layout structure (Header, MapPane, SectionDash, OverviewDash, TimeBar).
- [x] Create placeholder files for `MapPane.tsx`, `SectionDash.tsx`, `OverviewDash.tsx`, `TimeBar.tsx` in `src/components` directory.
- [x] Create `DataProvider.tsx` in `src/data` directory.
- [x] Create `store.ts` in `src/store` for Zustand.
- [x] Create `index.html` to include a root element for the React app.
- [x] Create `main.tsx` to render the `App` component.
- [x] Created WORKLOG.md and added plan.
### Step 2: Implement the DataProvider
- [x] Create a Web Worker (`data.worker.ts`) to fetch and parse CSV and shapefile data.
- [x] Use `shapefile-js` to parse shapefiles.
- [x] Use `papaparse` to parse CSV data.
- [x] Join the data based on `MapID` and transform it into the specified `features[]` structure.
- [x] In `DataProvider.tsx`, use TanStack Query to manage the fetched data.
- [x] Expose hooks for components to access the data.
### Step 3: Implement the MapPane component
- [x] Initialize MapLibre GL JS (verified)
- [x] Use deck.gl `LineLayer` (simplified, aiming for stable build)
- [~] Implement visual encoding rules (simplified, pre-calculated)
    - [x] Added specific rules for dry flows (0 flow rate): 2px width, #CCCCCC color at 40% opacity.
- [x] Add persistent text labels at midpoints of lines (using Deck.gl TextLayer, white text with black halo).
- [x] Implement click and hover interactions (basic done, Zustand for sectionId)
- [x] Ensure the map pane adjusts its size based on viewport dimensions (used Tailwind CSS for 40vh mobile, 60vh desktop).
### Step 4: Implement the TimeBar component
- [x] Create a slider (Radix) and a dropdown menu (select) for year selection.
- [x] Implement play/pause functionality for animating the year.
- [x] Ensure the component updates the global `selectedYear` state.
- [x] Style with Tailwind CSS and Radix UI (basic styling applied).
### Step 5: Implement the SectionDash component
- [x] Subscribe to `selectedSectionId` and `selectedYear` from the global store.
- [x] Fetch and display data (name, type) for the selected section.
- [~] Render a sparkline chart (1979-2021) using Vega-Lite (basic implementation done).
- [x] Display average flow by decade using bar charts (Vega-Lite) (calculated decades 1980s-2020s, rendered with VegaLite).
- [x] Show percentage change badges (vs. previous year and vs. 10-year average for selectedYear).
### Step 6: Implement the OverviewDash component
- [x] Subscribe to `selectedYear` from the global store.
- [x] Calculate and display KPI grid for the chosen year (e.g., total flow, % into canals).
- [x] Render small multiple charts over time using Vega-Lite (achieved via two separate charts: Total System Flow and River vs Canal Flow over time).
### Step 7: Implement global state management (Zustand)
- [x] Define the store in `store.ts` (selectedYear and selectedSectionId implemented)
- [x] Provide actions to update these state variables (for selectedYear and selectedSectionId)
- [x] Connect components that need access to this global state (MapPane for selectedYear and selectedSectionId)
### Step 8: Implement routing
- [x] Manually manage URL hash.
- [x] Update URL hash when `selectedSectionId` or `selectedYear` changes.
- [x] Parse URL hash on initial load to set the initial state.
### Step 9: Style the application
- [x] Refactored `App.tsx` layout to use Tailwind CSS.
- [x] Implemented `Header` and `LeftRail` components with Tailwind CSS in `App.tsx`.
- [x] Replaced native select in `TimeBar.tsx` with Radix UI `DropdownMenu`, styled with Tailwind CSS.
- [x] Standardized styling in `SectionDash` and `OverviewDash` (padding, typography, chart/KPI containers).
- [x] Reviewed `MapPane` styling for layout compatibility and removed debug border.
- [x] Investigated Radix UI Tooltip for `MapPane`; improved existing HTML tooltip styling due to integration complexity.
- [x] Ensured consistent font and color usage across the application (Tailwind defaults and theme colors).
- [~] Apply Tailwind CSS classes to all components for layout and styling (ongoing, major components addressed).
- [~] Use Radix UI components where specified (Dropdown, Slider, Tooltip) (partially done, Tooltip deferred for MapPane).
- [ ] Ensure the application adheres to the visual design specified in the issue.
### Step 10: Address non-functional requirements
- [x] Set up basic i18n structure with `i18next` and `react-i18next`, created `en.json` with initial translations, and updated key components (`App`, `TimeBar`, `SectionDash`, `OverviewDash`) to use `useTranslation`.
- [x] Set up Vite PWA plugin for basic offline support (configured `vite.config.ts`, added manifest icons, updated `index.html`).
- [ ] Test for performance (initial load, animation FPS) and optimize if necessary.
- [ ] Ensure WCAG 2.2 AA accessibility (keyboard navigation, contrast).
