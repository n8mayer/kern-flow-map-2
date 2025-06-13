import React, { useMemo } from 'react';
import { VegaLite, VisualizationSpec } from 'react-vega';
import { useAppStore } from '../store/store';
import { useFlowData } from '../hooks/useFlowData';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface PercentageChange {
  value: number;
  direction: 'increase' | 'decrease' | 'neutral' | 'unavailable';
  label: string;
}

const SectionDash: React.FC = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const selectedSectionId = useAppStore((state) => state.selectedSectionId);
  const selectedYear = useAppStore((state) => state.selectedYear); // Now used for percentage changes
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

  const decadeData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return null;

    const decadesMap = new Map<string, { sum: number; count: number; years: number[] }>();

    const getDecadeLabel = (year: number): string | null => {
      if (year >= 1980 && year <= 1989) return '1980-1989';
      if (year >= 1990 && year <= 1999) return '1990-1999';
      if (year >= 2000 && year <= 2009) return '2000-2009';
      if (year >= 2010 && year <= 2019) return '2010-2019';
      if (year >= 2020 && year <= 2029) return '2020-2029';
      return null;
    };

    sparklineData.forEach(d => {
      const decadeLabel = getDecadeLabel(d.year);
      if (decadeLabel) {
        if (!decadesMap.has(decadeLabel)) {
          decadesMap.set(decadeLabel, { sum: 0, count: 0, years: [] });
        }
        const current = decadesMap.get(decadeLabel)!;
        current.sum += d.flow;
        current.count += 1;
        current.years.push(d.year);
      }
    });

    const result = Array.from(decadesMap.entries())
      .map(([decade, data]) => ({
        decade,
        averageFlow: data.count > 0 ? data.sum / data.count : 0,
        yearRange: `${Math.min(...data.years)}-${Math.max(...data.years)} (${data.count} years)`,
      }))
      .sort((a, b) => a.decade.localeCompare(b.decade)); // Sort by decade label

    return result.length > 0 ? result : null;
  }, [sparklineData]);

  const percentageChanges = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0 || !selectedYear) {
      return { vsPreviousYear: null, vsTenYearAverage: null, currentFlowDescription: 'N/A' };
    }

    const currentYearData = sparklineData.find(d => d.year === selectedYear);
    const previousYearData = sparklineData.find(d => d.year === selectedYear - 1);

    let vsPreviousYear: PercentageChange | null = null;
    if (currentYearData && previousYearData && previousYearData.flow > 0) {
      const change = ((currentYearData.flow - previousYearData.flow) / previousYearData.flow) * 100;
      vsPreviousYear = {
        value: change,
        direction: change > 0.01 ? 'increase' : change < -0.01 ? 'decrease' : 'neutral',
        label: t('sectionDash.badgeLabelVsPrevious', { year: selectedYear - 1 }),
      };
    } else if (currentYearData && previousYearData && previousYearData.flow === 0 && currentYearData.flow > 0) {
       vsPreviousYear = { value: Infinity, direction: 'increase', label: t('sectionDash.badgeLabelVsPreviousFromZero', { year: selectedYear - 1 }) };
    } else {
      vsPreviousYear = { value: 0, direction: 'unavailable', label: t('sectionDash.badgeLabelVsPrevious', { year: selectedYear - 1 }) };
    }

    const tenYearWindow = sparklineData.filter(d => d.year >= selectedYear - 10 && d.year < selectedYear);
    let vsTenYearAverage: PercentageChange | null = null;
    if (currentYearData && tenYearWindow.length > 0) {
      const sum = tenYearWindow.reduce((acc, curr) => acc + curr.flow, 0);
      const avg = sum / tenYearWindow.length;
      const yearRange = `${selectedYear - 10}-${selectedYear - 1}`;
      if (avg > 0) {
        const change = ((currentYearData.flow - avg) / avg) * 100;
        vsTenYearAverage = {
          value: change,
          direction: change > 0.01 ? 'increase' : change < -0.01 ? 'decrease' : 'neutral',
          label: t('sectionDash.badgeLabelVsTenYearAvg', { yearRange }),
        };
      } else if (avg === 0 && currentYearData.flow > 0) {
        vsTenYearAverage = { value: Infinity, direction: 'increase', label: t('sectionDash.badgeLabelVsTenYearAvgFromZero', { yearRange }) };
      } else {
         vsTenYearAverage = { value: 0, direction: 'unavailable', label: t('sectionDash.badgeLabelVsTenYearAvg', { yearRange }) };
      }
    } else {
       vsTenYearAverage = { value: 0, direction: 'unavailable', label: t('sectionDash.badgeLabelVsTenYearAvg', { yearRange: `${selectedYear - 10}-${selectedYear - 1}` }) };
    }

    const currentFlowDescription = currentYearData
      ? `${currentYearData.flow.toFixed(2)} ${t('overviewDash.acreFeetAbbreviation')} in ${selectedYear}`
      : `${t('sectionDash.noData')} for ${selectedYear}`;

    return { vsPreviousYear, vsTenYearAverage, currentFlowDescription };
  }, [sparklineData, selectedYear, t]);

  if (isLoadingFlowData) {
    return <div className="p-4 text-gray-600">{t('sectionDash.loadingData')}</div>;
  }

  if (!selectedFeature) {
    return (
      <div className="p-4 text-gray-600 h-full flex items-center justify-center">
        <p>{t('sectionDash.selectSectionPrompt')}</p>
      </div>
    );
  }

  const sparklineSpec: VisualizationSpec | null = sparklineData ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: t('sectionDash.flowTrendTitle'), // Translated title
    description: `Flow data for ${selectedFeature.properties.name} from 1979-2021.`, // Description can remain as is or be translated if needed
    width: 'container',
    height: 150,
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
    // Added space-y-6 for consistent vertical spacing between sections
    <div className="p-4 h-full overflow-y-auto space-y-6">
      <div> {/* Info Block */}
        <h2 className="text-2xl font-semibold mb-1 text-slate-700">
          {/* Section name is data, not a static string. Prefix can be translated if needed. */}
          {/* For example: t('sectionDash.sectionTitle', { name: selectedFeature.properties.name }) */}
          {selectedFeature.properties.name}
        </h2>
        <p className="text-sm text-gray-600 mb-0.5">
          {t('sectionDash.typeLabel')}: <span className="font-semibold text-gray-800">{selectedFeature.properties.type}</span>
        </p>
        <p className="text-sm text-gray-600">
          {t('sectionDash.idLabel')}: <span className="font-mono text-xs text-gray-700">{selectedFeature.id}</span>
        </p>
      </div>

      {sparklineSpec && (
        <div className="bg-white p-3 rounded-lg shadow-md">
          {/* Vega-Lite spec now includes the title, no separate h3 needed if title is part of spec */}
          {/* <h3 className="text-lg font-semibold text-slate-600 mb-2">{t('sectionDash.flowTrendTitle')}</h3> */}
          <VegaLite spec={sparklineSpec} actions={false} />
        </div>
      )}
      {!sparklineSpec && !isLoadingFlowData && selectedFeature && (
         <p className="text-gray-500 px-3">{t('sectionDash.noFlowDataForTrend')}</p>
      )}

      {/* Decade Bar Chart */}
      <div>
        <h3 className="text-lg font-semibold text-slate-600 mb-2">{t('sectionDash.avgFlowByDecadeTitle')}</h3>
        {decadeData && decadeData.length > 0 ? (
          <div className="bg-white p-3 rounded-lg shadow-md">
            <VegaLite spec={getDecadeChartSpec(decadeData, selectedFeature?.properties.name || 'Selected Section', t)} actions={false} />
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-md text-center text-gray-500">
            {sparklineData ? t('sectionDash.notEnoughDataForDecades') : t('sectionDash.noFlowDataAvailable')}
          </div>
        )}
      </div>

      <div> {/* Comparison Block */}
        <h3 className="text-lg font-semibold text-slate-600 mb-2">{t('sectionDash.flowForYearTitle', { year: selectedYear })}</h3>
        <p className="text-xl font-bold text-indigo-600 mb-3">
          {percentageChanges.currentFlowDescription}
        </p>
        <h4 className="text-md font-semibold text-slate-500 mb-2">{t('sectionDash.comparisonBadgesTitle')}:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {percentageChanges.vsPreviousYear ? (
            <Badge change={percentageChanges.vsPreviousYear ?? {value: 0, direction: 'unavailable', label: t('sectionDash.badgeLabelVsPrevious', { year: selectedYear -1 })}} t={t} />
            <Badge change={percentageChanges.vsTenYearAverage ?? {value: 0, direction: 'unavailable', label: t('sectionDash.badgeLabelVsTenYearAvg', { yearRange: `${selectedYear - 10}-${selectedYear -1}` })}} t={t} />
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ change: PercentageChange; t: (key: string) => string }> = ({ change, t }) => {
  let bgColor = 'bg-slate-100';
  let textColor = 'text-slate-600';
  let textPrefix = '';

  if (change.direction === 'increase') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    textPrefix = '+';
  } else if (change.direction === 'decrease') {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
  } else if (change.direction === 'neutral') {
    bgColor = 'bg-sky-100';
    textColor = 'text-sky-800';
  }

  const displayValue = Number.isFinite(change.value) ? `${textPrefix}${change.value.toFixed(1)}%` : `${textPrefix}∞%`;

  if (change.direction === 'unavailable') {
     return (
      <div className="p-3 bg-slate-50 rounded-lg shadow text-center">
        <span className={`block text-sm font-medium ${textColor}`}>{t('sectionDash.noData')}</span>
        <span className="text-xs text-slate-500 mt-0.5 block">{change.label}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg shadow text-center ${bgColor}`}>
      <span className={`block text-xl font-bold ${textColor}`}>
        {displayValue}
      </span>
      <span className="text-xs text-slate-500 mt-0.5 block">{change.label}</span>
    </div>
  );
};


const getDecadeChartSpec = (data: any[], sectionName: string, t: (key: string) => string): VisualizationSpec => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  title: t('sectionDash.avgFlowByDecadeTitle'), // Translated title for chart
  description: `Average flow by decade for ${sectionName}.`, // Keep dynamic part as is
  width: 'container',
  height: 180,
  padding: 5,
  data: { values: data },
  mark: { type: 'bar', tooltip: true },
  encoding: {
    x: {
      field: 'decade',
      type: 'ordinal', // Ordinal to respect the sort order of input data if provided, or can specify sort array
      title: 'Decade',
      axis: { labelAngle: -45 },
      sort: data.map(d => d.decade) // Ensures bars are sorted as per the data array (already sorted by decade label)
    },
    y: {
      field: 'averageFlow',
      type: 'quantitative',
      title: 'Avg. Flow (acre-feet)',
      axis: { grid: true, gridDash: [2,2] }
    },
    tooltip: [
      { field: 'decade', title: 'Decade' },
      { field: 'averageFlow', title: 'Avg. Flow (af)', format: '.2f' },
      { field: 'yearRange', title: 'Years Included' }
    ]
  },
  config: {
    axis: { labelFontSize: 10, titleFontSize: 12 },
    view: { stroke: 'transparent' } // No border around the chart view itself
  }
});

export default SectionDash;
