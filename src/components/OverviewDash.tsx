import React, { useMemo } from 'react';
import { VegaLite, VisualizationSpec } from 'react-vega';
import { useAppStore, getAvailableYears } from '../store/store';
import { useFlowData } from '../hooks/useFlowData'; // FlowFeature is implicitly used via useFlowData return type
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface YearlyTotalFlow {
  year: number;
  totalFlow: number;
  totalRiverFlow: number;
  totalCanalFlow: number;
}

const OverviewDash: React.FC = () => {
  const { t } = useTranslation(); // Initialize useTranslation
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
    return <div className="p-4 text-gray-600">{t('overviewDash.loadingOverviewData')}</div>;
  }

  const totalFlowChartSpec: VisualizationSpec | null = totalSystemFlowOverTime ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: t('overviewDash.totalSystemFlowChartTitle'),
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
    title: t('overviewDash.riverVsCanalFlowChartTitle'),
    width: 'container',
    height: 200,
    padding: 5,
    data: { values: totalSystemFlowOverTime },
    transform: [
        { fold: ['totalRiverFlow', 'totalCanalFlow'], as: ['flowType', 'flowValue'] }
    ],
    mark: { type: 'line', point: false, tooltip: true, interpolate: 'monotone' },
    encoding: {
      x: { field: 'year', type: 'temporal', timeUnit: 'year', axis: { title: t('timebar.year'), format: '%Y' } }, // Reused timebar.year
      y: { field: 'flowValue', type: 'quantitative', axis: { title: `${t('sectionDash.flowForYearTitle', {year: ''})} (${t('overviewDash.acreFeetAbbreviation')})` } }, // Combined keys
      color: { field: 'flowType', type: 'nominal', legend: { title: t('overviewDash.flowTypeLabel') } },
      tooltip: [
        { field: 'year', type: 'temporal', timeUnit: 'year', title: t('timebar.year') },
        { field: 'flowType', type: 'nominal', title: 'Type'},
        { field: 'flowValue', type: 'quantitative', title: 'Flow (af)', format: ',.0f' }
      ]
    },
  } : null;


  return (
    <div className="p-4 h-full overflow-y-auto space-y-6">
      <h2 className="text-2xl font-semibold text-slate-700">{t('overviewDash.systemOverviewTitle')}</h2>

      {systemAggregatesForSelectedYear && (
        <div className="p-3 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-slate-600 mb-3">{t('overviewDash.kpisForYearTitle', { year: selectedYear })}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-sky-50 rounded-lg">
              <p className="text-sm font-medium text-sky-700">{t('overviewDash.totalSystemFlow')}</p>
              <p className="text-2xl font-bold text-sky-900 mt-1">
                {systemAggregatesForSelectedYear.totalSystemFlowForSelectedYear.toLocaleString(undefined, {maximumFractionDigits: 0})}
                <span className="text-xs font-normal text-slate-600 ml-1">{t('overviewDash.acreFeetAbbreviation')}</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm font-medium text-emerald-700">{t('overviewDash.totalCanalFlow')}</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {systemAggregatesForSelectedYear.totalCanalFlowForSelectedYear.toLocaleString(undefined, {maximumFractionDigits: 0})}
                <span className="text-xs font-normal text-slate-600 ml-1">{t('overviewDash.acreFeetAbbreviation')}</span>
              </p>
            </div>
            <div className="p-3 bg-violet-50 rounded-lg">
              <p className="text-sm font-medium text-violet-700">{t('overviewDash.percentageIntoCanals')}</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">
                {systemAggregatesForSelectedYear.percentageIntoCanals.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {totalFlowChartSpec && (
        <div className="bg-white p-3 rounded-lg shadow-md">
          <VegaLite spec={totalFlowChartSpec} actions={false} />
        </div>
      )}

      {riverCanalFlowChartSpec && (
        <div className="bg-white p-3 rounded-lg shadow-md">
          <VegaLite spec={riverCanalFlowChartSpec} actions={false} />
        </div>
      )}

      {!systemAggregatesForSelectedYear && !totalSystemFlowOverTime && !isLoadingFlowData && (
         <p className="text-gray-500">{t('overviewDash.noOverviewData')}</p>
      )}
    </div>
  );
};

export default OverviewDash;
