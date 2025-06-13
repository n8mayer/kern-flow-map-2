import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFeatureType, fetchAndProcessDataForAllSources, FlowFeature } from '../data/data.worker'; // Adjusted import path
import * as shapefile from 'shapefile';
import * as Papa from 'papaparse';

// Mock shapefile library
vi.mock('shapefile', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    read: vi.fn(),
  };
});

// Mock papaparse library
// Use vi.hoisted to ensure mockPapaParseActualFn is available to the hoisted vi.mock factory
const { mockPapaParseActualFn } = vi.hoisted(() => {
  return { mockPapaParseActualFn: vi.fn() };
});

vi.mock('papaparse', async () => {
  // Assuming papaparse's default export is an object with a 'parse' method.
  return {
    default: {
      parse: mockPapaParseActualFn,
      // Add other papaparse functions if they are used by the worker and need mocking.
    },
    // If 'parse' is also a named export and used as such, mock it here too.
    // parse: mockPapaParseActualFn,
  };
});


describe('data.worker', () => {
  // Mock global fetch
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks for each test
    global.fetch = mockFetch; // Reassign mockFetch before each test
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear all mocks after each test
  });

  describe('getFeatureType', () => {
    it('should correctly identify river features', () => {
      expect(getFeatureType('/path/to/some_river_file.shp', {})).toBe('river');
      expect(getFeatureType('/path/to/NHDStreamRiverKernRiver_rev.shp', {})).toBe('river');
    });

    it('should correctly identify canal features', () => {
      expect(getFeatureType('/path/to/some_canal_file.shp', {})).toBe('canal');
      expect(getFeatureType('/path/to/Canals_KernRiver_Merged_rev.shp', {})).toBe('canal');
    });

    it('should correctly identify weir features from point type with TYPE property', () => {
      expect(getFeatureType('/path/to/some_point_file.shp', { TYPE: 'weir' })).toBe('weir');
      expect(getFeatureType('/path/to/Points_Metro_Bak_Canals_Rev.shp', { TYPE: 'weir' })).toBe('weir');
      expect(getFeatureType('/path/to/some_point_file.shp', { TYPE: 'Weir' })).toBe('weir');
    });

    it('should default to weir for point type if TYPE property is not weir or missing', () => {
      expect(getFeatureType('/path/to/some_point_file.shp', { TYPE: 'other' })).toBe('weir');
      expect(getFeatureType('/path/to/Points_Metro_Bak_Canals_Rev.shp', {})).toBe('weir');
    });

    it('should correctly identify weir features from weir keyword in path', () => {
      expect(getFeatureType('/path/to/some_weir_file.shp', {})).toBe('weir');
    });

    it('should default to canal for unknown file path keywords if not point/weir', () => {
      expect(getFeatureType('/path/to/some_other_file.shp', {})).toBe('canal');
      expect(getFeatureType('/path/to/another_unknown_structure.dat', {})).toBe('canal');
    });

    it('should be case-insensitive for file path keywords', () => {
      expect(getFeatureType('/path/to/SOME_RIVER_FILE.SHP', {})).toBe('river');
      expect(getFeatureType('/path/to/SoMe_CaNaL_FiLe.sHp', {})).toBe('canal');
      expect(getFeatureType('/path/to/SOME_WEIR_FILE.shp', { TYPE: 'weir' })).toBe('weir');
    });
  });

  describe('fetchAndProcessDataForAllSources', () => {
    const mockCsvData = `MapID,1979,1980
C1,10,12
R1,100,102
W1,5,6`;

    const mockCanalShpGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: { MapID: 'C1', NAME: 'Canal Alpha' },
        },
      ],
    };

    const mockRiverShpGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[2, 2], [3, 3]] },
          properties: { MAPID: 'R1', Name: 'River Beta' },
        },
        { // Feature with MultiLineString
          type: 'Feature',
          geometry: { type: 'MultiLineString', coordinates: [[[4,4],[5,5]], [[6,6],[7,7]]] },
          properties: { MAPID: 'R2', Name: 'River Gamma Multi' },
        }
      ],
    };

    const mockWeirShpGeoJson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [10, 10] },
                properties: { SiteID: 'W1', NAME: 'Weir Charlie', TYPE: 'Weir' },
            }
        ]
    };

    const csvFilePath = '/fake/0_KERN_RIVER_MASTER_DATA_rev6.csv';
    const shapefileConfigs = [
      { path: '/fake/canals.shp', typeOverride: null },
      { path: '/fake/rivers.shp', typeOverride: 'river' },
      { path: '/fake/weirs.shp', typeOverride: 'weir' },
    ];

    it('should successfully load, merge data, and simplify MultiLineString', async () => {
      // Mock fetch responses
      mockFetch
        .mockResolvedValueOnce({ // CSV
          ok: true,
          text: async () => mockCsvData,
        })
        .mockResolvedValueOnce({ // Canal SHP
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(0), // Mock buffer
        })
        .mockResolvedValueOnce({ // Canal DBF
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(0), // Mock buffer
        })
        .mockResolvedValueOnce({ // River SHP
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(0),
        })
        .mockResolvedValueOnce({ // River DBF
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(0),
        })
        .mockResolvedValueOnce({ // Weir SHP
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        })
        .mockResolvedValueOnce({ // Weir DBF
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });

      // Mock Papa.parse's implementation for this specific test
      mockPapaParseActualFn.mockReturnValue({
        data: [
          { MapID: 'C1', '1979': '10', '1980': '12' },
          { MapID: 'R1', '1979': '100', '1980': '102' },
          { MapID: 'W1', '1979': '5', '1980': '6' },
          { MapID: 'R2', '1979': '200', '1980': '205' }, // For MultiLineString feature
        ],
        errors: [],
        meta: { fields: ['MapID', '1979', '1980'] },
      });

      // Mock shapefile.read
      // Need to ensure the mock is typed correctly for shapefile.read
      const mockedShapefileRead = shapefile.read as vi.MockedFunction<typeof shapefile.read>;
      mockedShapefileRead
        .mockResolvedValueOnce(mockCanalShpGeoJson as any) // Cast as any to bypass strict GeoJSON type for mock
        .mockResolvedValueOnce(mockRiverShpGeoJson as any)
        .mockResolvedValueOnce(mockWeirShpGeoJson as any);

      const result = await fetchAndProcessDataForAllSources(csvFilePath, shapefileConfigs);

      expect(mockFetch).toHaveBeenCalledTimes(1 + shapefileConfigs.length * 2); // 1 CSV + 2 per SHP
      expect(mockPapaParseActualFn).toHaveBeenCalledOnce();
      expect(shapefile.read).toHaveBeenCalledTimes(shapefileConfigs.length);

      expect(result).toHaveLength(4); // C1, R1, R2 (from MultiLineString), W1

      // Check Canal C1
      const canalC1 = result.find(f => f.id === 'C1_canal');
      expect(canalC1).toBeDefined();
      expect(canalC1?.properties.name).toBe('Canal Alpha');
      expect(canalC1?.properties.type).toBe('canal');
      expect(canalC1?.properties.flows).toEqual({ '1979': 10, '1980': 12 });
      expect(canalC1?.geometry.type).toBe('LineString');

      // Check River R1
      const riverR1 = result.find(f => f.id === 'R1_river');
      expect(riverR1).toBeDefined();
      expect(riverR1?.properties.name).toBe('River Beta');
      expect(riverR1?.properties.type).toBe('river');
      expect(riverR1?.properties.flows).toEqual({ '1979': 100, '1980': 102 });
      expect(riverR1?.geometry.type).toBe('LineString');

      // Check River R2 (from MultiLineString)
      const riverR2 = result.find(f => f.id === 'R2_river');
      expect(riverR2).toBeDefined();
      expect(riverR2?.properties.name).toBe('River Gamma Multi');
      expect(riverR2?.properties.type).toBe('river');
      expect(riverR2?.properties.flows).toEqual({ '1979': 200, '1980': 205 });
      expect(riverR2?.geometry.type).toBe('LineString');
      // Verify that the first segment of the MultiLineString was used
      expect((riverR2?.geometry as GeoJSON.LineString).coordinates).toEqual([[4,4],[5,5]]);

      // Check Weir W1
      const weirW1 = result.find(f => f.id === 'W1_weir');
      expect(weirW1).toBeDefined();
      expect(weirW1?.properties.name).toBe('Weir Charlie');
      expect(weirW1?.properties.type).toBe('weir');
      expect(weirW1?.properties.flows).toEqual({'1979': 5, '1980': 6});
      expect(weirW1?.geometry.type).toBe('Point');

    });

    it('should handle CSV parsing errors', async () => {
      // Mock fetch to successfully return CSV data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsvData, // mockCsvData is defined above
      });

      // Mock Papa.parse to return errors
      mockPapaParseActualFn.mockReturnValue({
        data: [], // No data successfully parsed
        errors: [{ type: 'Quotes', code: 'MissingQuotes', message: 'Missing quotes', row: 1 }],
        meta: { fields: [] },
      });

      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      // We don't need shapefile data for this test, so fetch can error for them or return empty
      // For simplicity, let's assume no shapefiles are processed or fetch for them is minimal
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });


      const result = await fetchAndProcessDataForAllSources(csvFilePath, []); // No shapefiles needed for this specific test

      expect(mockPapaParseActualFn).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Worker: Errors during CSV parsing:', [{ type: 'Quotes', code: 'MissingQuotes', message: 'Missing quotes', row: 1 }]);
      expect(result).toEqual([]); // Expect empty result as CSV parsing failed to produce data for merging

      consoleWarnSpy.mockRestore(); // Clean up spy
    });

    it('should handle fetch errors for CSV file', async () => {
      // Mock fetch to throw an error for the CSV file
      mockFetch.mockRejectedValueOnce(new Error('Network error fetching CSV'));

      // Expect the function to throw an error
      await expect(fetchAndProcessDataForAllSources(csvFilePath, shapefileConfigs))
        .rejects
        .toThrow('Network error fetching CSV');

      // Ensure no other mocks were unintentionally called
      expect(mockPapaParseActualFn).not.toHaveBeenCalled();
      expect(shapefile.read).not.toHaveBeenCalled();
    });

    it('should handle fetch errors for a SHP file', async () => {
      mockFetch
        .mockResolvedValueOnce({ // CSV ok
          ok: true,
          text: async () => mockCsvData,
        })
        .mockRejectedValueOnce(new Error('Network error fetching SHP')) // For the .shp file
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }); // For the corresponding .dbf file, let it succeed or also fail

      // Mock Papa.parse to return some data for CSV
      mockPapaParseActualFn.mockReturnValue({
        data: [{ MapID: 'C1', '1979': '10', '1980': '12' }],
        errors: [],
        meta: { fields: ['MapID', '1979', '1980'] },
      });

      // Spy on console.error for this test, as errors in shapefile processing are caught and logged
      const consoleErrorSpy = vi.spyOn(console, 'error');

      // Only one shapefile config for simplicity
      const singleShapefileConfig = [shapefileConfigs[0]]; // e.g., canals.shp
      const result = await fetchAndProcessDataForAllSources(csvFilePath, singleShapefileConfig);

      expect(mockFetch).toHaveBeenCalledTimes(3); // CSV (1) + SHP attempt (1 for .shp, 1 for .dbf)
      expect(mockPapaParseActualFn).toHaveBeenCalledOnce(); // For CSV
      // shapefile.read should not be called if the SHP fetch fails
      // However, the Promise.all for shp/dbf means both fetches are attempted.
      expect(shapefile.read).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Worker: Error processing shapefile ${singleShapefileConfig[0].path}:`,
        // The error caught by the worker will be the one from the SHP fetch
        expect.objectContaining({ message: 'Network error fetching SHP' })
      );
      // Result should be empty as the only shapefile processing failed
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing MapID in CSV data', async () => {
      mockFetch.mockResolvedValueOnce({ // CSV
        ok: true,
        text: async () => "MapID,1979\n,10\nC2,20", // Row 1 missing MapID
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');
      mockPapaParseActualFn.mockReturnValue({
        data: [ { MapID: null, '1979': '10' }, { MapID: 'C2', '1979': '20' } ],
        errors: [],
        meta: { fields: ['MapID', '1979'] },
      });

      // Mock shapefile responses (not strictly needed as we focus on CSV here, but good to have)
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); // For any SHP/DBF
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValue({ type: 'FeatureCollection', features: [] });


      const result = await fetchAndProcessDataForAllSources(csvFilePath, []); // No shapefiles needed

      expect(mockPapaParseActualFn).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Worker: Skipping CSV row with missing MapID:', { MapID: null, '1979': '10' });
      // C2 should still be in flowDataMap internally, but since no shapefiles match, result is empty
      expect(result).toEqual([]);
      consoleWarnSpy.mockRestore();
    });

    it('should handle missing MapID in Shapefile features', async () => {
      mockFetch.mockResolvedValueOnce({ // CSV
        ok: true,
        text: async () => "MapID,1979\nC1,10",
      });
      mockPapaParseActualFn.mockReturnValue({
        data: [ { MapID: 'C1', '1979': '10' } ],
        errors: [],
        meta: { fields: ['MapID', '1979'] },
      });

      // Mock SHP/DBF fetches for one shapefile
      const shapefilePath = '/fake/canals_missing_mapid.shp';
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); // DBF

      const mockFeatureWithoutMapID = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { NAME: 'NoMapID' } };
      const mockFeatureWithMapID = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[2,2],[3,3]] }, properties: { MapID: 'C1', NAME: 'Canal C1' } };
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [mockFeatureWithoutMapID as any, mockFeatureWithMapID as any],
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const result = await fetchAndProcessDataForAllSources(csvFilePath, [{ path: shapefilePath, typeOverride: 'canal' }]);

      expect(shapefile.read).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Worker: Feature in ${shapefilePath} missing MapID. Properties:`, { NAME: 'NoMapID' });
      expect(result).toHaveLength(1); // Only C1 should be processed
      expect(result[0].id).toBe('C1_canal');
      consoleWarnSpy.mockRestore();
    });

    it('should handle MapIDs in shapefiles with no corresponding flow data in CSV', async () => {
      // CSV data has C1, but shapefile will have C1 and C2
      mockFetch.mockResolvedValueOnce({ // CSV
        ok: true,
        text: async () => "MapID,1979\nC1,10",
      });
      mockPapaParseActualFn.mockReturnValue({
        data: [ { MapID: 'C1', '1979': '10' } ],
        errors: [],
        meta: { fields: ['MapID', '1979'] },
      });

      const shapefilePath = '/fake/canals_extra_mapid.shp';
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); // DBF

      const mockFeatureC1 = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { MapID: 'C1', NAME: 'Canal C1' } };
      const mockFeatureC2 = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[2,2],[3,3]] }, properties: { MapID: 'C2', NAME: 'Canal C2 (No CSV Data)' } };
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [mockFeatureC1 as any, mockFeatureC2 as any],
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const result = await fetchAndProcessDataForAllSources(csvFilePath, [{ path: shapefilePath, typeOverride: 'canal' }]);

      expect(shapefile.read).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Worker: No flow data found for MapID C2 from ${shapefilePath}. Assigning empty flows.`);

      expect(result).toHaveLength(2);

      const featureC1 = result.find(f => f.id === 'C1_canal');
      expect(featureC1).toBeDefined();
      expect(featureC1?.properties.flows).toEqual({ '1979': 10 });

      const featureC2 = result.find(f => f.id === 'C2_canal');
      expect(featureC2).toBeDefined();
      expect(featureC2?.properties.name).toBe('Canal C2 (No CSV Data)');
      expect(featureC2?.properties.flows).toEqual({}); // Key assertion: flows is empty

      consoleWarnSpy.mockRestore();
    });

    it('should skip unsupported geometry types', async () => {
      mockFetch.mockResolvedValueOnce({ // CSV
        ok: true,
        text: async () => "MapID,1979\nPoly1,50\nLine1,60",
      });
      mockPapaParseActualFn.mockReturnValue({
        data: [ { MapID: 'Poly1', '1979': '50' }, { MapID: 'Line1', '1979': '60' } ],
        errors: [],
        meta: { fields: ['MapID', '1979'] },
      });

      const shapefilePath = '/fake/mixed_geometries.shp';
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); // DBF

      const mockPolygonFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[0,0],[1,1],[0,1],[0,0]]] },
        properties: { MapID: 'Poly1', NAME: 'Polygon Feature' },
      };
      const mockLineStringFeature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[2,2],[3,3]] },
        properties: { MapID: 'Line1', NAME: 'LineString Feature' },
      };
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [mockPolygonFeature as any, mockLineStringFeature as any],
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const result = await fetchAndProcessDataForAllSources(csvFilePath, [{ path: shapefilePath, typeOverride: 'canal' }]);

      expect(shapefile.read).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Worker: Feature for MapID Poly1 has unsupported geometry type: Polygon. Skipping.`
      );

      expect(result).toHaveLength(1); // Only LineStringFeature should be processed
      expect(result[0].id).toBe('Line1_canal');
      expect(result[0].properties.name).toBe('LineString Feature');
      expect(result[0].properties.flows).toEqual({ '1979': 60 });

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty CSV data (features get empty flows)', async () => {
      mockFetch.mockResolvedValueOnce({ // CSV
        ok: true,
        text: async () => "", // Empty CSV content
      });
      mockPapaParseActualFn.mockReturnValue({ // Papa.parse returns no data
        data: [],
        errors: [],
        meta: { fields: [] },
      });

      // Setup mocks for shapefile fetching (enough for one shapefile config)
      const singleShapefilePath = '/fake/one_canal.shp';
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); // DBF

      // Mock shapefile.read to return one feature
      const oneCanalFeature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { MapID: 'C1', NAME: 'Test Canal' } };
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValueOnce({
        type: 'FeatureCollection',
        features: [oneCanalFeature as any],
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const result = await fetchAndProcessDataForAllSources(csvFilePath, [{ path: singleShapefilePath, typeOverride: 'canal' }]);

      expect(mockPapaParseActualFn).toHaveBeenCalledOnce();
      expect(shapefile.read).toHaveBeenCalledOnce(); // Called for the single shapefile

      expect(result).toHaveLength(1); // One feature should be processed
      expect(result[0].id).toBe('C1_canal');
      expect(result[0].properties.name).toBe('Test Canal');
      expect(result[0].properties.flows).toEqual({}); // Key assertion: flows is empty

      // Check if the warning for missing flow data was called
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Worker: No flow data found for MapID C1 from ${singleShapefilePath}. Assigning empty flows.`
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle empty shapefiles', async () => {
      mockFetch.mockResolvedValueOnce({ // CSV - with data
        ok: true,
        text: async () => mockCsvData,
      });
      mockPapaParseActualFn.mockReturnValue({ // Papa.parse returns data
        data: [ { MapID: 'C1', '1979': '10' } ],
        errors: [],
        meta: { fields: ['MapID', '1979'] },
      });

      // Mock SHP/DBF fetches for shapefiles
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // Shapefile 1 SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // Shapefile 1 DBF
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // Shapefile 2 SHP
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) // Shapefile 2 DBF
         // etc. for all shapefileConfigs
        .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });


      // Mock shapefile.read to return empty feature collections for all shapefiles
      (shapefile.read as vi.MockedFunction<typeof shapefile.read>).mockResolvedValue({
        type: 'FeatureCollection',
        features: [],
      });

      const result = await fetchAndProcessDataForAllSources(csvFilePath, shapefileConfigs); // Use all shapefileConfigs

      expect(mockPapaParseActualFn).toHaveBeenCalledOnce(); // CSV processed
      expect(shapefile.read).toHaveBeenCalledTimes(shapefileConfigs.length); // All shapefiles read
      expect(result).toEqual([]); // No features should be generated if shapefiles are empty
    });

    // The MultiLineString test is now part of the successful merge test.
  });
});
