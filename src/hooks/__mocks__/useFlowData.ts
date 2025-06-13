import { vi } from 'vitest';
import type { FlowFeature } from '../../data/data.worker'; // Adjust path as necessary

// Default mock features - can be overridden in tests if needed
export const mockFlowFeatures: FlowFeature[] = [
  {
    id: 'C1',
    geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] },
    properties: { name: 'Canal Alpha', type: 'canal', flows: { '1995': 100, '2000': 120 } }
  },
  {
    id: 'R1',
    geometry: { type: 'LineString', coordinates: [[2,2],[3,3]] },
    properties: { name: 'River Beta', type: 'river', flows: { '1995': 200, '2000': 220 } }
  },
  {
    id: 'W1',
    geometry: { type: 'Point', coordinates: [4,4] },
    properties: { name: 'Weir Charlie', type: 'weir', flows: { '1995': 50, '2000': 60 } }
  },
];

export const useFlowData = vi.fn(() => ({
  data: mockFlowFeatures,
  isLoading: false,
  error: null,
}));

// Helper to update the mock's return value for specific tests
export const setMockUseFlowData = (
  data: FlowFeature[] | null,
  isLoading: boolean,
  error: Error | null
) => {
  useFlowData.mockReturnValue({ data, isLoading, error });
};
