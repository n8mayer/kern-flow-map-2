import { useEffect, useRef } from 'react';
import { useAppStore, MIN_YEAR, MAX_YEAR } from '../store/store';
import { useFlowData } from '../hooks/useFlowData'; // To validate section IDs if needed

const URLStateSync: React.FC = () => {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const setSelectedYear = useAppStore((state) => state.setSelectedYear);
  const selectedSectionId = useAppStore((state) => state.selectedSectionId);
  const setSelectedSectionId = useAppStore((state) => state.setSelectedSectionId);
  const { data: flowFeatures } = useFlowData(); // For validating section ID

  const isInitialLoad = useRef(true);
  const hasAppliedInitialHash = useRef(false);

  // Update URL hash when store changes
  useEffect(() => {
    // Don't update hash on initial load if we are about to parse it,
    // or if the initial hash has just been applied to the store.
    if (isInitialLoad.current || hasAppliedInitialHash.current) {
        // If initial hash was just applied, reset the flag so subsequent changes update the hash.
        if (hasAppliedInitialHash.current) hasAppliedInitialHash.current = false;
        return;
    }

    const hashParts: string[] = [];
    if (selectedSectionId) {
      hashParts.push(`section/${encodeURIComponent(selectedSectionId)}`);
    }
    if (selectedYear) {
      hashParts.push(`year/${selectedYear}`);
    }

    const newHash = hashParts.length > 0 ? `#/` + hashParts.join('/') : '#';

    // Only update if different to prevent loops if other things are also setting hash
    if (window.location.hash !== newHash && !(window.location.hash === '' && newHash === '#')) {
        // Using replaceState to avoid polluting browser history too much with every selection
        window.history.replaceState(null, '', newHash);
    }
  }, [selectedYear, selectedSectionId]);

  // Parse URL hash on initial load
  useEffect(() => {
    if (!isInitialLoad.current) return; // Only run once

    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const path = hash.substring(2); // Remove '#/'
      const parts = path.split('/');

      let yearFromHash: string | null = null;
      let sectionIdFromHash: string | null = null;

      for (let i = 0; i < parts.length; i += 2) {
        const key = parts[i];
        const value = parts[i+1] ? decodeURIComponent(parts[i+1]) : null;

        if (key === 'year' && value) {
          const numericYear = parseInt(value, 10);
          if (!isNaN(numericYear) && numericYear >= MIN_YEAR && numericYear <= MAX_YEAR) {
            yearFromHash = value;
          } else {
            console.warn(`Invalid year in URL hash: ${value}. Ignoring.`);
          }
        } else if (key === 'section' && value) {
          // Basic validation: section ID should exist in flowFeatures if they are loaded.
          // This check depends on flowFeatures being available.
          // If flowFeatures aren't loaded yet, we might optimistically set it,
          // or wait. For now, set optimistically. A more robust solution might involve
          // a loading state or ensuring data is present before applying section ID.
          sectionIdFromHash = value;
        }
      }

      if (yearFromHash || sectionIdFromHash) {
        hasAppliedInitialHash.current = true; // Signal that we are applying initial hash values
        if (yearFromHash && yearFromHash !== selectedYear) {
            setSelectedYear(yearFromHash);
        }
        if (sectionIdFromHash && sectionIdFromHash !== selectedSectionId) {
            // Optional: Validate sectionIdFromHash against flowFeatures
            // For now, the component relies on flowFeatures being loaded for validation,
            // but the provided logic sets it optimistically.
            // A check like:
            if (flowFeatures && !flowFeatures.some(f => f.id === sectionIdFromHash)) {
              console.warn(`Invalid section ID in URL hash or not found in loaded data: ${sectionIdFromHash}. Ignoring.`);
            } else {
              // Set if features are not yet loaded (optimistic) or if ID is valid
              setSelectedSectionId(sectionIdFromHash);
            }
        }
      }
    }
    isInitialLoad.current = false;
  }, [setSelectedYear, setSelectedSectionId, flowFeatures, selectedYear, selectedSectionId]); // Added flowFeatures, selectedYear, selectedSectionId to deps for correctness

  // This component doesn't render anything itself
  return null;
};

export default URLStateSync;
