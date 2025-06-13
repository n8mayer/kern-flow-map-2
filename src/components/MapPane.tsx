import React, { useState, useCallback, useMemo } from 'react';
import Map, { ViewState } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator, type ViewStateChangeParameters, type PickingInfo } from '@deck.gl/core'; // Added PickingInfo
import { LineLayer, TextLayer } from '@deck.gl/layers'; // Import TextLayer
import { useFlowData } from '../hooks/useFlowData';
import type { FlowFeature } from '../data/data.worker';
import { useAppStore } from '../store/store'; // Added Zustand store import
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -119.0187,
  latitude: 35.3733,
  zoom: 8,
  pitch: 0,
  bearing: 0,
  padding: { top: 20, bottom: 20, left: 20, right: 20 }
};

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

import {
  calculateLineWidthLogic,
  determineFeatureColor,
  // Constants are used internally by determineFeatureColor, no need to import them all here
  // unless directly used for other purposes in MapPane.tsx.
} from './MapPane.utils';

// Interface for data passed to Deck.gl layers after processing
interface ProcessedFlowFeature extends FlowFeature {
  calculatedWidth: number;
  calculatedColor: [number, number, number, number];
  sourcePosition: [number, number] | [number, number, number];
  targetPosition: [number, number] | [number, number, number];
  midPoint: [number, number] | [number, number, number]; // Added for TextLayer
}

const MapPane: React.FC = () => {
  const { data: flowFeatures, isLoading, error } = useFlowData();
  const selectedYear = useAppStore((state) => state.selectedYear);
  const selectedSectionId = useAppStore((state) => state.selectedSectionId);
  const setSelectedSectionId = useAppStore((state) => state.setSelectedSectionId);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<PickingInfo<ProcessedFlowFeature> | null>(null); // Typed hoverInfo

  const onViewStateChange = useCallback((params: ViewStateChangeParameters) => {
    setViewState(params.viewState as Partial<ViewState>);
  }, []);

  // getCalculatedLineWidth now calls the extracted logic
  const getCalculatedLineWidth = useCallback((flow: number | undefined, isSelected: boolean): number => {
    return calculateLineWidthLogic(flow, isSelected);
  }, []);

  const layers = useMemo(() => {
    if (isLoading || !flowFeatures) {
      return [];
    }

    const processedLayerData: ProcessedFlowFeature[] = flowFeatures.map(feature => {
      const flowForYear = feature.properties.flows[selectedYear];
      const isSelected = feature.id === selectedSectionId;
      const isRiver = feature.properties.type === 'river';

      // Use the extracted color determination logic
      const finalColor = determineFeatureColor(flowForYear, isSelected, isRiver);

      let srcPos: [number, number] | [number, number, number] = [0,0];
      let tgtPos: [number, number] | [number, number, number] = [0,0];
      let midPos: [number, number] | [number, number, number] = [0,0];

      if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
        srcPos = feature.geometry.coordinates[0] as [number, number] | [number, number, number];
        tgtPos = feature.geometry.coordinates[feature.geometry.coordinates.length - 1] as [number, number] | [number, number, number];
        // Calculate midpoint for LineString
        const midIndex = Math.floor(feature.geometry.coordinates.length / 2);
        midPos = feature.geometry.coordinates[midIndex] as [number, number] | [number, number, number];
      } else if (feature.geometry.type === 'Point') {
        const pointCoords = feature.geometry.coordinates as [number, number] | [number, number, number];
        srcPos = pointCoords;
        tgtPos = pointCoords;
        midPos = pointCoords; // Midpoint for a point is its own position
      }

      return {
        ...feature,
        sourcePosition: srcPos,
        targetPosition: tgtPos,
        midPoint: midPos, // Store calculated midpoint
        calculatedWidth: getCalculatedLineWidth(flowForYear, isSelected),
        calculatedColor: finalColor,
      };
    });

    const lines = new LineLayer<ProcessedFlowFeature>({
      id: 'flow-lines-interactive',
      data: processedLayerData,
      pickable: true,
      getWidth: d => d.calculatedWidth,
      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,
      getColor: d => d.calculatedColor,
      widthMinPixels: 1,
      onHover: (info: PickingInfo<ProcessedFlowFeature>) => { // Typed info
        if (info.object) {
          setHoverInfo(info);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: (info: PickingInfo<ProcessedFlowFeature>) => { // Typed info
        if (info.object) {
          // feature is already info.object and correctly typed if info is typed
          setSelectedSectionId(info.object.id);
          // FlyTo logic
          if (info.object.geometry.type === 'LineString' && info.object.geometry.coordinates.length > 0) {
            const firstCoord = info.object.geometry.coordinates[0] as [number,number];
            setViewState(currentViewState => ({
              ...currentViewState,
              longitude: firstCoord[0],
              latitude: firstCoord[1],
              zoom: Math.max(currentViewState.zoom || INITIAL_VIEW_STATE.zoom!, 12),
              transitionDuration: 1000,
              transitionInterpolator: new FlyToInterpolator(),
            }));
          } else if (info.object.geometry.type === 'Point') {
            const coords = info.object.geometry.coordinates as [number,number];
            setViewState(currentViewState => ({
              ...currentViewState,
              longitude: coords[0],
              latitude: coords[1],
              zoom: Math.max(currentViewState.zoom || INITIAL_VIEW_STATE.zoom!, 14),
              transitionDuration: 1000,
              transitionInterpolator: new FlyToInterpolator(),
            }));
          }
        } else {
          setSelectedSectionId(null);
        }
      },
    });

    const textLabels = new TextLayer<ProcessedFlowFeature>({
      id: 'text-labels-layer',
      data: processedLayerData,
      getPosition: d => d.midPoint,
      getText: d => d.properties.name,
      getSize: 12,
      getColor: [255, 255, 255, 255], // White text
      getOutlineColor: [0, 0, 0, 255], // Black halo
      outlineWidth: 2, // Halo thickness in pixels
      fontSettings: {
        sdf: true, // Use SDF for better rendering with outline
      },
      pickable: false, // Labels not pickable
    });

    return [lines, textLabels]; // Add text layer to the map

  }, [flowFeatures, isLoading, selectedYear, selectedSectionId, setSelectedSectionId, getCalculatedLineWidth]); // Removed INITIAL_VIEW_STATE.zoom

  if (isLoading) return <div style={{padding: '20px', textAlign: 'center', color: 'blue'}}>Loading map data...</div>;
  if (error) return <div style={{padding: '20px', color: 'red', textAlign: 'center'}}>Error loading map data: {error.message}</div>;
  if (!flowFeatures) return <div style={{padding: '20px', textAlign: 'center', color: 'orange'}}>No flow features loaded.</div>;
  if (flowFeatures.length === 0) return <div style={{padding: '20px', textAlign: 'center', color: 'purple'}}>Flow features loaded, but the array is empty.</div>;

  // Use Tailwind CSS for responsive height: h-[40vh] for mobile (default), md:h-[60vh] for desktop
  // Removed debug border.
  return (
    <div className="h-[40vh] md:h-[60vh]" style={{ position: 'relative', width: '100%' }}>
      <DeckGL
        layers={layers}
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState as ViewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        getTooltip={({object}) => { // object is the currently hovered item from DeckGL
          if (!hoverInfo || !hoverInfo.object || !object || (object as ProcessedFlowFeature).id !== hoverInfo.object.id) return null;
          // Use hoverInfo.object for consistent data, as 'object' might be a subset or different instance
          const feature = hoverInfo.object;
          const flow = feature.properties.flows[selectedYear];
          // Style the tooltip to be more consistent with a Radix-like theme (dark, rounded)
          // Direct Radix component integration is complex with deck.gl's getTooltip expecting HTML/style object.
          return {
            html: `
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 0.875rem; /* text-sm */">
                <strong style="font-weight: 600; /* font-semibold */ color: #E2E8F0; /* slate-200 */">${feature.properties.name}</strong>
                <br/>
                <span style="color: #CBD5E1; /* slate-300 */">Flow: ${flow !== undefined ? flow.toFixed(2) + ' af (Jan ' + selectedYear + ')' : 'N/A'}</span>
              </div>
            `,
            style: {
              backgroundColor: 'rgba(30, 41, 59, 0.9)', // bg-slate-800 with opacity
              padding: '8px 12px', // p-2 or p-3 like
              borderRadius: '6px', // rounded-md
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-lg
              color: 'white', // Default text color (though overridden above)
              // Prevent map interaction issues by ensuring pointer events are 'none' for the tooltip itself
              // This is often handled by deck.gl by default, but explicit can be good.
            }
          };
        }}
      >
        <Map reuseMaps mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
};

export default MapPane;
