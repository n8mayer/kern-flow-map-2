// In this file, you can add global setup configurations for your tests.
// For example, you can extend Vitest's expect functionality with jest-dom matchers:
import '@testing-library/jest-dom/vitest';

// If you have other global setups, you can add them here.

// Mock for window.URL.createObjectURL, used by maplibre-gl
if (typeof window.URL.createObjectURL === 'undefined') {
  try {
    window.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
  } catch (e) {
    // In some environments, window.URL might be read-only or not fully mockable.
    // This is a fallback. Consider more robust JSDOM configurations if this fails.
    console.error("Failed to mock window.URL.createObjectURL:", e);
  }
}
// Mock for window.URL.revokeObjectURL, also used by maplibre-gl
if (typeof window.URL.revokeObjectURL === 'undefined') {
    try {
        window.URL.revokeObjectURL = vi.fn();
    } catch (e) {
        console.error("Failed to mock window.URL.revokeObjectURL:", e);
    }
}
// For now, this file can remain empty if no global setup is immediately needed.

// Mock for ResizeObserver
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Mock for HTMLCanvasElement.getContext, used by vega
if (typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.getContext === 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') {
      // Return a mock 2D context
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ width:0, height:0, data: new Uint8ClampedArray(0)})),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        // Add other methods if vega/deck needs them
      };
    }
    return null; // For other contexts like 'webgl' if not needed for these tests
  });
}


// Example: Mocking a global function or variable
// global.myGlobalFunction = vi.fn(() => 'mocked value');
