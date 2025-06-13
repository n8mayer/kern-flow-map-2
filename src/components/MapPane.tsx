import React, { useState, useCallback, useMemo } from 'react';
import Map, { ViewState } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator, type ViewStateChangeParameters, type PickingInfo } from '@deck.gl/core'; // Added PickingInfo
import { LineLayer } from '@deck.gl/layers';
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

const KERN_RIVER_COLOR: [number, number, number, number] = [30, 144, 255, 255];
const OTHER_FLOW_COLOR: [number, number, number, number] = [46, 139, 87, 255];
const SELECTED_COLOR: [number, number, number, number] = [0, 255, 255, 255]; // Cyan for selected
const DEFAULT_OPACITY_VALUE = 0.8 * 255; // Renamed to avoid conflict with layer prop
const SELECTED_OPACITY_VALUE = 255;


// Interface for data passed to Deck.gl layers after processing
interface ProcessedFlowFeature extends FlowFeature {
  calculatedWidth: number;
  calculatedColor: [number, number, number, number];
  sourcePosition: [number, number] | [number, number, number];
  targetPosition: [number, number] | [number, number, number];
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

  const getCalculatedLineWidth = useCallback((flow: number | undefined, isSelected: boolean): number => {
    let width = 2;
    if (flow !== undefined && flow !== null && !isNaN(flow) && flow !== 0) {
      const k = 0.1;
      width = Math.min(Math.max(Math.sqrt(flow) * k, 2), 16);
    }
    return isSelected ? width + 2 : width; // Make selected lines slightly wider
  }, []);

  const layers = useMemo(() => {
    if (isLoading || !flowFeatures) {
      return [];
    }

    const processedLayerData: ProcessedFlowFeature[] = flowFeatures.map(feature => {
      const flowForYear = feature.properties.flows[selectedYear];
      const isSelected = feature.id === selectedSectionId;
      const isRiver = feature.properties.type === 'river';

      let baseColor = isRiver ? KERN_RIVER_COLOR : OTHER_FLOW_COLOR;
      if (isSelected) {
        baseColor = SELECTED_COLOR;
      }

      const finalColor: [number,number,number,number] = [baseColor[0], baseColor[1], baseColor[2], isSelected ? SELECTED_OPACITY_VALUE : DEFAULT_OPACITY_VALUE];

      let srcPos: [number, number] | [number, number, number] = [0,0];
      let tgtPos: [number, number] | [number, number, number] = [0,0];

      if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
        srcPos = feature.geometry.coordinates[0] as [number, number] | [number, number, number];
        tgtPos = feature.geometry.coordinates[feature.geometry.coordinates.length - 1] as [number, number] | [number, number, number];
      } else if (feature.geometry.type === 'Point') {
        srcPos = feature.geometry.coordinates as [number, number] | [number, number, number];
        tgtPos = feature.geometry.coordinates as [number, number] | [number, number, number];
      }

      return {
        ...feature,
        sourcePosition: srcPos,
        targetPosition: tgtPos,
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

    return [lines];

  }, [flowFeatures, isLoading, selectedYear, selectedSectionId, setSelectedSectionId, getCalculatedLineWidth]); // Removed INITIAL_VIEW_STATE.zoom

  if (isLoading) return <div style={{padding: '20px', textAlign: 'center', color: 'blue'}}>Loading map data...</div>;
  if (error) return <div style={{padding: '20px', color: 'red', textAlign: 'center'}}>Error loading map data: {error.message}</div>;
  if (!flowFeatures) return <div style={{padding: '20px', textAlign: 'center', color: 'orange'}}>No flow features loaded.</div>;
  if (flowFeatures.length === 0) return <div style={{padding: '20px', textAlign: 'center', color: 'purple'}}>Flow features loaded, but the array is empty.</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '60vh', border: '1px dashed blue' }}>
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
          return {
            html: `              <div style="background-color: white; color: black; padding: 5px; border-radius: 3px; fontFamily: 'sans-serif', fontSize: '0.9em'">
                <strong>${feature.properties.name}</strong><br/>
                Flow: ${flow !== undefined ? flow.toFixed(2) + ' af (Jan ' + selectedYear + ')' : 'N/A'}
              </div>`,
            style: { backgroundColor: 'transparent', boxShadow: 'none' }
          };
        }}
      >
        <Map reuseMaps mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
};

export default MapPane;
