import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, getAvailableYears, MIN_YEAR, MAX_YEAR } from '../store/store';
import * as SliderPrimitive from '@radix-ui/react-slider';
// Using a simple select for dropdown for now, Radix DropdownMenu can be integrated later for more complex styling/features
// import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

const TimeBar: React.FC = () => {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const setSelectedYear = useAppStore((state) => state.setSelectedYear);
  const availableYears = getAvailableYears();

  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const FPS = 6; // Frames per second for animation
  const frameInterval = 1000 / FPS;

  const handleYearChange = (year: string) => {
    if (isPlaying) setIsPlaying(false); // Stop animation on manual change
    setSelectedYear(year);
  };

  const handleSliderChange = (value: number[]) => {
    handleYearChange(String(value[0]));
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const animate = useCallback((timestamp: number) => {
    // if (!isPlaying) { // This check is now done in useEffect before calling requestAnimationFrame
    //   if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    //   return;
    // }

    if (timestamp - lastFrameTime.current >= frameInterval) {
      lastFrameTime.current = timestamp;
      const currentYearIndex = availableYears.indexOf(selectedYear);
      let nextYearIndex = currentYearIndex + 1;
      if (nextYearIndex >= availableYears.length) {
        nextYearIndex = 0; // Loop back to the start
      }
      setSelectedYear(availableYears[nextYearIndex]);
    }
    animationFrameId.current = requestAnimationFrame(animate);
  }, [selectedYear, availableYears, setSelectedYear, frameInterval]); // Removed isPlaying from here as its change should trigger useEffect

  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, animate]);

  return (
    <div className="p-4 bg-gray-100 border-t border-gray-300 flex items-center space-x-4">
      <button
        onClick={togglePlayPause}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {isPlaying ? 'Pause ⏸' : 'Play ▶'}
      </button>

      <div className="flex-grow"> {/* flex-grow needs to be on a container that can grow */}
        <SliderPrimitive.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[parseInt(selectedYear, 10)]}
          onValueChange={handleSliderChange}
          min={MIN_YEAR}
          max={MAX_YEAR}
          step={1}
          aria-label="Year Slider"
        >
          <SliderPrimitive.Track className="bg-gray-300 relative grow rounded-full h-1">
            <SliderPrimitive.Range className="absolute bg-blue-500 rounded-full h-full" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block w-5 h-5 bg-white shadow-md rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" />
        </SliderPrimitive.Root>
      </div>

      <span className="text-lg font-medium w-20 text-center">{selectedYear}</span>

      <div>
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Year Select"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TimeBar;
