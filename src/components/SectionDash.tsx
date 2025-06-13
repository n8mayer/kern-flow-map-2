import React, { useMemo } from 'react';
import { VegaLite, VisualizationSpec } from 'react-vega';
import { useAppStore } from '../store/store';
import { useFlowData } from '../hooks/useFlowData';

const SectionDash: React.FC = () => {
  const selectedSectionId = useAppStore((state) => state.selectedSectionId);
  // const selectedYear = useAppStore((state) => state.selectedYear); // Not directly used for sparkline, but for context
  const { data: flowFeatures, isLoading: isLoadingFlowData } = useFlowData();

  const selectedFeature = useMemo(() => {
    if (!selectedSectionId || !flowFeatures) return null;
    return flowFeatures.find(f => f.id === selectedSectionId) || null;
  }, [selectedSectionId, flowFeatures]);

  const sparklineData = useMemo(() => {
    if (!selectedFeature || !selectedFeature.properties.flows) return null;

    return Object.entries(selectedFeature.properties.flows)
      .map(([year, flow]) => ({
        year: parseInt(year, 10), // Vega-Lite prefers numbers or Date objects for temporal axes
        flow: flow === null || isNaN(flow) ? 0 : flow, // Handle null/NaN flows, treat as 0 for chart
      }))
      .sort((a, b) => a.year - b.year); // Ensure data is sorted by year for line chart
  }, [selectedFeature]);

  if (isLoadingFlowData) {
    return <div className="p-4 text-gray-600">Loading section data...</div>;
  }

  if (!selectedFeature) {
    return (
      <div className="p-4 text-gray-600 h-full flex items-center justify-center">
        <p>Select a river or canal section on the map to see details.</p>
      </div>
    );
  }

  const sparklineSpec: VisualizationSpec | null = sparklineData ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: `Flow data for ${selectedFeature.properties.name} from 1979-2021.`,
    width: 'container', // Responsive width
    height: 150, // Fixed height for sparkline
    padding: 5,
    data: {
      values: sparklineData,
    },
    mark: {
      type: 'line',
      point: false, // No points on the line for a cleaner sparkline
      tooltip: true, // Enable tooltip on hover over the line
      interpolate: 'monotone', // Smoother line
    },
    encoding: {
      x: {
        field: 'year',
        type: 'temporal',
        timeUnit: 'year', // Treat year numbers as years
        axis: { title: 'Year', format: '%Y', labelAngle: -45 },
      },
      y: {
        field: 'flow',
        type: 'quantitative',
        axis: { title: 'Flow (acre-feet)' },
        scale: { zero: false } // Don't necessarily start y-axis at zero for sparklines to show variation
      },
      tooltip: [ // More specific tooltip fields
        { field: 'year', type: 'temporal', timeUnit: 'year', title: 'Year' },
        { field: 'flow', type: 'quantitative', title: 'Flow (af)', format: '.2f' }
      ]
    },
    config: {
      axis: { grid: true, gridDash: [2,2] } // Light grid lines
    }
  } : null;

  return (
    <div className="p-4 border-t border-gray-200 h-full overflow-y-auto">
      <h2 className="text-xl font-semibold mb-2 text-blue-700">
        Section: {selectedFeature.properties.name}
      </h2>
      <p className="text-sm text-gray-500 mb-1">Type: <span className="font-medium text-gray-700">{selectedFeature.properties.type}</span></p>
      <p className="text-sm text-gray-500 mb-3">ID: <span className="font-mono text-xs text-gray-600">{selectedFeature.id}</span></p>

      {sparklineSpec ? (
        <div className="bg-white p-2 rounded shadow">
          <h3 className="text-md font-medium text-gray-800 mb-1">Flow Trend (1979-2021)</h3>
          <VegaLite spec={sparklineSpec} actions={false} />
        </div>
      ) : (
        <p className="text-gray-500">No flow data available to display chart for this section.</p>
      )}

      {/* Placeholders for future elements */}
      <div className="mt-6">
        <h3 className="text-md font-medium text-gray-800 mb-2">Average Flow by Decade</h3>
        <div className="p-4 bg-gray-100 rounded text-center text-gray-500">
          [Decade Bar Chart Placeholder]
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-md font-medium text-gray-800 mb-2">Percentage Change Badges</h3>
        <div className="p-4 bg-gray-100 rounded text-center text-gray-500">
          [% Change Badges Placeholder]
        </div>
      </div>
    </div>
  );
};

export default SectionDash;
