import React, { useMemo } from 'react';
import { VegaLite, VisualizationSpec } from 'react-vega';
import { useAppStore, getAvailableYears } from '../store/store';
import { useFlowData } from '../hooks/useFlowData'; // FlowFeature is implicitly used via useFlowData return type

interface YearlyTotalFlow {
  year: number;
  totalFlow: number;
  totalRiverFlow: number;
  totalCanalFlow: number;
}

const OverviewDash: React.FC = () => {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const { data: flowFeatures, isLoading: isLoadingFlowData } = useFlowData();
  const availableYears = getAvailableYears();

  const systemAggregatesForSelectedYear = useMemo(() => {
    if (!flowFeatures || !selectedYear) return null;

    let totalSystemFlow = 0;
    let totalCanalFlow = 0;

    flowFeatures.forEach(feature => {
      const flow = feature.properties.flows[selectedYear];
      if (flow && !isNaN(flow)) {
        totalSystemFlow += flow;
        if (feature.properties.type === 'canal') {
          totalCanalFlow += flow;
        }
      }
    });

    const percentageIntoCanals = totalSystemFlow > 0 ? (totalCanalFlow / totalSystemFlow) * 100 : 0;

    return {
      totalSystemFlowForSelectedYear: totalSystemFlow,
      totalCanalFlowForSelectedYear: totalCanalFlow,
      percentageIntoCanals: percentageIntoCanals,
    };
  }, [flowFeatures, selectedYear]);

  const totalSystemFlowOverTime = useMemo((): YearlyTotalFlow[] | null => {
    if (!flowFeatures) return null;

    const yearlyData: Record<string, { totalFlow: number, totalRiverFlow: number, totalCanalFlow: number }> = {};

    availableYears.forEach(yearStr => {
      yearlyData[yearStr] = { totalFlow: 0, totalRiverFlow: 0, totalCanalFlow: 0 };
    });

    flowFeatures.forEach(feature => {
      Object.entries(feature.properties.flows).forEach(([year, flowVal]) => {
        if (flowVal !== null && !isNaN(flowVal) && yearlyData[year]) {
          yearlyData[year].totalFlow += flowVal;
          if (feature.properties.type === 'river') {
            yearlyData[year].totalRiverFlow += flowVal;
          } else if (feature.properties.type === 'canal') {
            yearlyData[year].totalCanalFlow += flowVal;
          }
        }
      });
    });

    return Object.entries(yearlyData).map(([year, data]) => ({
      year: parseInt(year, 10),
      totalFlow: data.totalFlow,
      totalRiverFlow: data.totalRiverFlow,
      totalCanalFlow: data.totalCanalFlow,
    })).sort((a,b) => a.year - b.year);

  }, [flowFeatures, availableYears]);

  if (isLoadingFlowData) {
    return <div className="p-4 text-gray-600">Loading overview data...</div>;
  }

  const totalFlowChartSpec: VisualizationSpec | null = totalSystemFlowOverTime ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: 'Total System Flow (All Features)',
    width: 'container',
    height: 200,
    padding: 5,
    data: { values: totalSystemFlowOverTime },
    mark: { type: 'line', point: true, tooltip: true, interpolate: 'monotone' },
    encoding: {
      x: { field: 'year', type: 'temporal', timeUnit: 'year', axis: { title: 'Year', format: '%Y' } },
      y: { field: 'totalFlow', type: 'quantitative', axis: { title: 'Total Flow (acre-feet)' } },
      tooltip: [
        { field: 'year', type: 'temporal', timeUnit: 'year', title: 'Year' },
        { field: 'totalFlow', type: 'quantitative', title: 'Total Flow (af)', format: ',.0f' }
      ]
    },
  } : null;

  // Optional: Second chart for river vs canal flow
  const riverCanalFlowChartSpec: VisualizationSpec | null = totalSystemFlowOverTime ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: 'River vs. Canal Flow Over Time',
    width: 'container',
    height: 200,
    padding: 5,
    data: { values: totalSystemFlowOverTime },
    transform: [
        { fold: ['totalRiverFlow', 'totalCanalFlow'], as: ['flowType', 'flowValue'] }
    ],
    mark: { type: 'line', point: false, tooltip: true, interpolate: 'monotone' },
    encoding: {
      x: { field: 'year', type: 'temporal', timeUnit: 'year', axis: { title: 'Year', format: '%Y' } },
      y: { field: 'flowValue', type: 'quantitative', axis: { title: 'Flow (acre-feet)' } },
      color: { field: 'flowType', type: 'nominal', legend: { title: 'Flow Type' } },
      tooltip: [
        { field: 'year', type: 'temporal', timeUnit: 'year', title: 'Year' },
        { field: 'flowType', type: 'nominal', title: 'Type'},
        { field: 'flowValue', type: 'quantitative', title: 'Flow (af)', format: ',.0f' }
      ]
    },
  } : null;


  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-semibold mb-3 text-blue-700">System Overview</h2>

      {systemAggregatesForSelectedYear && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h3 className="text-md font-medium text-gray-800 mb-2">KPIs for {selectedYear}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-600">Total System Flow</p>
              <p className="text-2xl font-bold text-blue-800">
                {systemAggregatesForSelectedYear.totalSystemFlowForSelectedYear.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal">af</span>
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm text-green-600">Total Canal Flow</p>
              <p className="text-2xl font-bold text-green-800">
                {systemAggregatesForSelectedYear.totalCanalFlowForSelectedYear.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal">af</span>
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded">
              <p className="text-sm text-indigo-600">% Into Canals</p>
              <p className="text-2xl font-bold text-indigo-800">
                {systemAggregatesForSelectedYear.percentageIntoCanals.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {totalFlowChartSpec && (
        <div className="mb-6 bg-white p-2 rounded shadow">
          <VegaLite spec={totalFlowChartSpec} actions={false} />
        </div>
      )}

      {riverCanalFlowChartSpec && (
        <div className="bg-white p-2 rounded shadow">
          <VegaLite spec={riverCanalFlowChartSpec} actions={false} />
        </div>
      )}

      {!systemAggregatesForSelectedYear && !totalSystemFlowOverTime && !isLoadingFlowData && (
         <p className="text-gray-500">No overview data available.</p>
      )}
    </div>
  );
};

export default OverviewDash;
