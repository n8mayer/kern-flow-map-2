// Color and Style Constants - Moved here for centralized access and testability
export const KERN_RIVER_COLOR_RGB: [number, number, number] = [30, 144, 255]; // Opaque version
export const OTHER_FLOW_COLOR_RGB: [number, number, number] = [46, 139, 87]; // Opaque version
export const SELECTED_COLOR_RGB: [number, number, number] = [0, 255, 255];   // Opaque version Cyan for selected
export const DRY_FLOW_COLOR_RGBA: [number, number, number, number] = [204, 204, 204, 102]; // #CCCCCC at 40% opacity

export const DEFAULT_OPACITY_VALUE = 0.8 * 255;
export const SELECTED_OPACITY_VALUE = 255;

// Line Width Calculation Logic
export const calculateLineWidthLogic = (flow: number | undefined, isSelected: boolean): number => {
  if (flow === 0) {
    return 2; // Explicit width for dry flows
  }

  let width = 2; // Default width for undefined or null flows
  if (flow !== undefined && flow !== null && !isNaN(flow) && flow > 0) {
    const k = 0.1;
    // Ensure width is between 2px and 16px for flows > 0
    width = Math.min(Math.max(Math.sqrt(flow) * k, 2), 16);
  }

  // Selected lines are slightly wider, but only if not dry (flow > 0 handled by above, flow === 0 returns 2)
  // If flow is undefined/null, it uses the default width of 2, and selection adds 2.
  return isSelected ? width + 2 : width;
};

// Feature Color Determination Logic
export const determineFeatureColor = (
  flowForYear: number | undefined,
  isSelected: boolean,
  isRiver: boolean
): [number, number, number, number] => {
  if (flowForYear === 0) {
    return DRY_FLOW_COLOR_RGBA;
  }

  let baseColorRGB: [number, number, number];
  if (isSelected) {
    baseColorRGB = SELECTED_COLOR_RGB;
  } else {
    baseColorRGB = isRiver ? KERN_RIVER_COLOR_RGB : OTHER_FLOW_COLOR_RGB;
  }

  const opacity = isSelected ? SELECTED_OPACITY_VALUE : DEFAULT_OPACITY_VALUE;

  return [baseColorRGB[0], baseColorRGB[1], baseColorRGB[2], opacity];
};
