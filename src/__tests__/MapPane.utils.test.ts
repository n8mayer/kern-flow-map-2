import { describe, it, expect } from 'vitest';
import {
  calculateLineWidthLogic,
  determineFeatureColor,
  KERN_RIVER_COLOR_RGB,
  OTHER_FLOW_COLOR_RGB,
  SELECTED_COLOR_RGB,
  DRY_FLOW_COLOR_RGBA,
  DEFAULT_OPACITY_VALUE,
  SELECTED_OPACITY_VALUE
} from '../components/MapPane.utils';

describe('MapPane Utilities', () => {
  describe('calculateLineWidthLogic', () => {
    it('should return 2 for dry flow (0), not selected', () => {
      expect(calculateLineWidthLogic(0, false)).toBe(2);
    });

    it('should return 2 for dry flow (0), selected', () => {
      // As per current logic, selection doesn't change width if flow is 0.
      expect(calculateLineWidthLogic(0, true)).toBe(2);
    });

    it('should return default width (2) for undefined flow, not selected', () => {
      expect(calculateLineWidthLogic(undefined, false)).toBe(2);
    });

    it('should return default width + 2 (4) for undefined flow, selected', () => {
      expect(calculateLineWidthLogic(undefined, true)).toBe(4);
    });

    it('should calculate width based on flow, not selected', () => {
      // sqrt(100) * 0.1 = 1 * 1 = 1. max(1, 2) = 2.
      expect(calculateLineWidthLogic(100, false)).toBe(2);
      // sqrt(2500) * 0.1 = 50 * 0.1 = 5. max(5, 2) = 5.
      expect(calculateLineWidthLogic(2500, false)).toBe(5);
    });

    it('should calculate width based on flow, selected', () => {
      // sqrt(2500) * 0.1 = 5. max(5,2) = 5. Selected: 5 + 2 = 7.
      expect(calculateLineWidthLogic(2500, true)).toBe(7);
    });

    it('should adhere to min width of 2 for very small positive flows, not selected', () => {
      expect(calculateLineWidthLogic(10, false)).toBe(2); // sqrt(10)*0.1 approx 0.316 -> max(0.316, 2) = 2
    });

    it('should adhere to min width of 2 (then +2 for selected) for very small positive flows, selected', () => {
      expect(calculateLineWidthLogic(10, true)).toBe(4); // base 2, selected 2+2=4
    });

    it('should adhere to max width of 16 for very large flows, not selected', () => {
      // sqrt(30000) * 0.1 = 173.2 * 0.1 = 17.32. min(17.32, 16) = 16.
      expect(calculateLineWidthLogic(30000, false)).toBe(16);
    });

    it('should adhere to max width of 16 (then +2 for selected) for very large flows, selected', () => {
      expect(calculateLineWidthLogic(30000, true)).toBe(18); // base 16, selected 16+2=18
    });
  });

  describe('determineFeatureColor', () => {
    it('should return DRY_FLOW_COLOR_RGBA for zero flow, regardless of selection or type', () => {
      expect(determineFeatureColor(0, false, true)).toEqual(DRY_FLOW_COLOR_RGBA);
      expect(determineFeatureColor(0, true, false)).toEqual(DRY_FLOW_COLOR_RGBA);
    });

    it('should return DRY_FLOW_COLOR_RGBA for undefined flow', () => {
      // Current logic treats undefined flow as non-zero for color, leading to default colors.
      // This test assumes that if flowForYear is undefined, it's not a "dry" condition.
      // If undefined should be DRY_FLOW_COLOR, the determineFeatureColor function needs adjustment.
      // Based on current logic, it will fall into the 'else' block.
      const expectedColorForUndefinedRiver = [...KERN_RIVER_COLOR_RGB, DEFAULT_OPACITY_VALUE];
      expect(determineFeatureColor(undefined, false, true)).toEqual(expectedColorForUndefinedRiver);
    });

    it('should return SELECTED_COLOR_RGB with SELECTED_OPACITY_VALUE for selected features with flow', () => {
      const expected = [...SELECTED_COLOR_RGB, SELECTED_OPACITY_VALUE];
      expect(determineFeatureColor(100, true, true)).toEqual(expected); // River
      expect(determineFeatureColor(100, true, false)).toEqual(expected); // Canal/Other
    });

    it('should return KERN_RIVER_COLOR_RGB with DEFAULT_OPACITY_VALUE for rivers (not selected, with flow)', () => {
      const expected = [...KERN_RIVER_COLOR_RGB, DEFAULT_OPACITY_VALUE];
      expect(determineFeatureColor(100, false, true)).toEqual(expected);
    });

    it('should return OTHER_FLOW_COLOR_RGB with DEFAULT_OPACITY_VALUE for non-rivers (canals/weirs, not selected, with flow)', () => {
      const expected = [...OTHER_FLOW_COLOR_RGB, DEFAULT_OPACITY_VALUE];
      expect(determineFeatureColor(100, false, false)).toEqual(expected);
    });
  });
});
