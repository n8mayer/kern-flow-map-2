import * as shapefile from 'shapefile';
import Papa from 'papaparse';

// Define the expected structure for the flow data rows from CSV
interface FlowDataRow {
  MapID: string;
  [year: string]: string | number; // Year columns like '1979', '1980', ...
}

// Define the structure for the output features
export interface FlowFeature {
  id: string;
  geometry: GeoJSON.LineString | GeoJSON.Point;
  properties: {
    name: string;
    type: 'river' | 'canal' | 'weir';
    flows: { [yyyy: string]: number };
  };
}

// Function to determine feature type based on filename or properties
// This is a heuristic and might need adjustment based on actual data attributes
export const getFeatureType = (filePath: string, properties: Record<string, unknown>): 'river' | 'canal' | 'weir' => {
  const lowerFilePath = filePath.toLowerCase();

  // 1. Check for "point" or "weir" - these are most specific
  if (lowerFilePath.includes('point') || lowerFilePath.includes('weir')) {
    // Further check properties if available, e.g. a 'TYPE' field
    if (properties && properties.TYPE && String(properties.TYPE).toLowerCase() === 'weir') {
      return 'weir';
    }
    // If path indicates point/weir but TYPE property isn't 'weir', it's still a 'weir' by default for these paths
    return 'weir';
  }

  // 2. Then check for "canal"
  if (lowerFilePath.includes('canal')) {
    return 'canal';
  }

  // 3. Then check for "river"
  if (lowerFilePath.includes('river')) {
    return 'river';
  }

  // 4. Default for any other case
  return 'canal'; // Defaulting to 'canal' as per original logic for non-matching paths
};


// Extracted core logic for testability
export async function fetchAndProcessDataForAllSources(
  csvFilePath: string,
  shapefileConfigs: { path: string; typeOverride: 'river' | 'weir' | null }[]
): Promise<FlowFeature[]> {
  try {
    console.log('Worker: Starting data load for testing...');

    // 1. Load CSV data
    const csvResponse = await fetch(csvFilePath);
    if (!csvResponse.ok) throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
    const csvText = await csvResponse.text();
    const parseResult = Papa.parse<FlowDataRow>(csvText, {
      header: true,
      dynamicTyping: false, // Keep as string initially, convert specific fields later
      skipEmptyLines: true,
    });

    console.log(`Worker: CSV parsed. Rows: ${parseResult.data.length}`);
    if (parseResult.errors.length > 0) {
      console.warn('Worker: Errors during CSV parsing:', parseResult.errors);
    }

    const flowDataMap = new Map<string, { [yyyy: string]: number }>();
    parseResult.data.forEach(row => {
      if (!row.MapID) {
        console.warn('Worker: Skipping CSV row with missing MapID:', row);
        return;
      }
      const flows: { [yyyy: string]: number } = {};
      for (const key in row) {
        if (key.match(/^\d{4}$/)) { // Check if key is a 4-digit year
          const flowVal = parseFloat(String(row[key]));
          flows[key] = isNaN(flowVal) ? 0 : flowVal; // Default to 0 if NaN
        }
      }
      flowDataMap.set(row.MapID.trim(), flows);
    });
    console.log(`Worker: Flow data map created. Entries: ${flowDataMap.size}`);

    // 2. Load shapefiles
    const allFeatures: FlowFeature[] = [];

    for (const { path, typeOverride } of shapefileConfigs) {
      console.log(`Worker: Processing shapefile for testing: ${path}`);
      try {
        const [shpBuffer, dbfBuffer] = await Promise.all([
          fetch(path).then(res => { if (!res.ok) throw new Error(`SHP fetch failed: ${res.statusText}`); return res.arrayBuffer(); }),
          fetch(path.replace('.shp', '.dbf')).then(res => { if (!res.ok) throw new Error(`DBF fetch failed: ${res.statusText}`); return res.arrayBuffer(); })
        ]);
        console.log(`Worker: SHP and DBF fetched for ${path}`);

        const geojson = await shapefile.read(shpBuffer, dbfBuffer);
        console.log(`Worker: Shapefile ${path} read. Features found: ${geojson.features.length}`);

        if (geojson && geojson.features) {
          // The 'feature' type from shapefile.read is GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
          // GeoJSON.GeoJsonProperties can be Record<string, any> | null. We use Record<string, unknown> | null for stricter typing.
          geojson.features.forEach((feature: GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown> | null>) => {
            const mapIdPropertyKeys = ['MAPID', 'MapID', 'mapid', 'SiteID', 'SITEID']; // Common variations for MapID field
            let mapId: string | undefined = undefined;
            for (const key of mapIdPropertyKeys) {
              if (feature.properties && feature.properties[key]) {
                mapId = String(feature.properties[key]).trim();
                break;
              }
            }

            if (!mapId) {
              console.warn(`Worker: Feature in ${path} missing MapID. Properties:`, feature.properties);
              return; // Skip if no MapID
            }

            const sectionFlows = flowDataMap.get(mapId);
            if (!sectionFlows) {
              console.warn(`Worker: No flow data found for MapID ${mapId} from ${path}. Assigning empty flows.`);
              // It's possible some geo features don't have corresponding CSV entries.
              // Assign empty flows or handle as per requirements. For now, empty flows.
            }

            const namePropertyKeys = ['NAME', 'Name', 'SiteName', 'GNIS_Name']; // Common variations for Name
            let name = 'Unknown';
            for (const key of namePropertyKeys) {
                if (feature.properties && feature.properties[key]) {
                    name = String(feature.properties[key]);
                    break;
                }
            }

            // Determine feature type
            const featureType = typeOverride || getFeatureType(path, feature.properties || {});

            // Ensure geometry is of the correct type
            if (feature.geometry && (feature.geometry.type === 'LineString' || feature.geometry.type === 'Point' || feature.geometry.type === 'MultiLineString')) {

              // If MultiLineString, take the first LineString (simplification for now)
              // A more robust solution might create multiple features or merge lines
              let geometry = feature.geometry;
              if (feature.geometry.type === 'MultiLineString') {
                if (feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                  geometry = {
                    type: 'LineString',
                    coordinates: feature.geometry.coordinates[0] // Take the first line segment array
                  };
                } else {
                  console.warn(`Worker: MultiLineString feature for MapID ${mapId} has no coordinates. Skipping.`);
                  return;
                }
              }


              allFeatures.push({
                id: mapId + '_' + featureType, // Create a unique ID
                geometry: geometry as GeoJSON.LineString | GeoJSON.Point, // Cast after potential MultiLineString conversion
                properties: {
                  name: name,
                  type: featureType,
                  flows: sectionFlows || {}, // Use empty object if no flows found
                },
              });
            } else {
              console.warn(`Worker: Feature for MapID ${mapId} has unsupported geometry type: ${feature.geometry?.type}. Skipping.`);
            }
          });
        }
      } catch (error) {
        console.error(`Worker: Error processing shapefile ${path}:`, error);
      }
    }

    console.log('Worker: All data processed. Total features:', allFeatures.length);
    return allFeatures;
  } catch (error) {
    console.error('Worker: Error in fetchAndProcessDataForAllSources:', error);
    throw error;
  }
}

// Original function that the worker will call
async function loadAndProcessData(): Promise<FlowFeature[]> {
  const csvFilePath = '/0_KERN_RIVER_MASTER_DATA_rev6.csv';
  const shapefilePathsConfig = [
    { path: '/Canals_KernRiver_Merged_rev/Canals_KernRiver_Merged_rev.shp', typeOverride: null },
    { path: '/NHDStreamRiverKernRiver_rev/NHDStreamRiverKernRiver_rev.shp', typeOverride: 'river' },
    { path: '/Points_Metro_Bak_Canals_Rev/Points_Metro_Bak_Canals_Rev.shp', typeOverride: 'weir' },
  ];
  return fetchAndProcessDataForAllSources(csvFilePath, shapefilePathsConfig);
}

// Listen for messages from the main thread
// Ensure 'self' is defined or polyfilled for test environment if this part is tested.
// For now, we are testing fetchAndProcessDataForAllSources directly.
if (typeof self !== 'undefined' && self.onmessage !== undefined) {
  self.onmessage = async (event) => {
    if (event.data === 'loadData') {
      try {
        const processedData = await loadAndProcessData();
        self.postMessage({ type: 'dataLoaded', payload: processedData });
      } catch (error) {
        self.postMessage({ type: 'dataError', payload: (error as Error).message });
      }
    }
  };
}
