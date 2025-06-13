import { useQuery } from '@tanstack/react-query';
import { FlowFeature } from '../data/data.worker'; // Adjusted path

// This state will hold the data once loaded by the worker
// These need to be accessible by the hook, so they remain in this scope.
let workerDataCache: FlowFeature[] | null = null;
let workerErrorCache: string | null = null;
let isLoadingData = false;
const subscribers: ((data: FlowFeature[] | null, error: string | null) => void)[] = [];

// Initialize worker and trigger data load once
if (typeof Worker !== 'undefined' && !workerDataCache && !isLoadingData) {
  isLoadingData = true;
  // Adjusted URL path for the worker
  const worker = new Worker(new URL('../data/data.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (event) => {
    if (event.data.type === 'dataLoaded') {
      workerDataCache = event.data.payload;
      workerErrorCache = null;
      console.log('useFlowData: Data loaded from worker:', workerDataCache?.length);
    } else if (event.data.type === 'dataError') {
      workerErrorCache = event.data.payload;
      workerDataCache = null;
      console.error('useFlowData: Error from worker:', workerErrorCache);
    }
    isLoadingData = false;
    subscribers.forEach(sub => sub(workerDataCache, workerErrorCache));
    worker.terminate(); // Terminate worker after data is loaded
  };

  worker.onerror = (error) => {
    console.error('useFlowData: Worker error:', error);
    workerErrorCache = error.message;
    workerDataCache = null;
    isLoadingData = false;
    subscribers.forEach(sub => sub(workerDataCache, workerErrorCache));
    worker.terminate();
  };

  console.log('useFlowData: Requesting data from worker...');
  worker.postMessage('loadData');
} else if (typeof Worker === 'undefined') {
  console.error("useFlowData: Web Workers are not supported in this environment.");
  workerErrorCache = "Web Workers are not supported.";
}

// Custom hook to access the flow data
export const useFlowData = () => {
  return useQuery<FlowFeature[], Error, FlowFeature[], string[]>({
    queryKey: ['flowData'],
    queryFn: async () => {
      if (workerErrorCache) throw new Error(workerErrorCache);
      if (workerDataCache) return workerDataCache;
      return new Promise((resolve, reject) => {
        const checkData = () => {
          if (workerErrorCache) {
            reject(new Error(workerErrorCache));
            return;
          }
          if (workerDataCache) {
            resolve(workerDataCache);
            return;
          }
          if (!isLoadingData && !workerDataCache && !workerErrorCache) {
             reject(new Error("Failed to load data from worker."));
             return;
          }
          setTimeout(checkData, 100); // Poll for worker data
        };
        checkData();
      });
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: true,
  });
};
