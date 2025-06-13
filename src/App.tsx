import './App.css';
import { DataProvider } from './data/DataProvider'; // Ensure this path is correct
import MapPane from './components/MapPane'; // Added import
import TimeBar from './components/TimeBar'; // Added import
import SectionDash from './components/SectionDash'; // Added import
import OverviewDash from './components/OverviewDash'; // Added import
import URLStateSync from './routing/URLStateSync'; // Added import
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Placeholders for components - Assuming these are defined or imported elsewhere
// For simplicity, defining them here if not already.
// Ensure these definitions are consistent with your actual component structure.
const Header = () => {
  const { t } = useTranslation();
  return (
    <header className="text-2xl font-bold p-4 bg-slate-200 text-center shadow-md">
      {t('app.headerTitle')}
    </header>
  );
};

// Mock components for SectionDash, etc.
// In a real app, these would be imported from './components/...'
// const MapPanePlaceholder = () => <div style={{ height: '60vh', border: '1px solid #ccc', margin: '5px', backgroundColor: '#e9e9e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MapPane Placeholder</div>; // Removed
// const SectionDashPlaceholder = () => <div style={{ flex: 1, border: '1px solid #ccc', margin: '5px', backgroundColor: '#f9f9f9', padding: '10px' }}>SectionDash Placeholder</div>; // Removed
// const OverviewDashPlaceholder = () => <div style={{ flex: 1, border: '1px solid #ccc', margin: '5px', backgroundColor: '#f9f9f9', padding: '10px' }}>OverviewDash Placeholder</div>; // Removed
// const TimeBarPlaceholder = () => <div style={{ border: '1px solid #ccc', margin: '5px', padding: '10px', backgroundColor: '#e9e9e9', textAlign: 'center' }}>TimeBar Placeholder</div>; // Removed

// Define LeftRail component
const LeftRail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-96 bg-slate-50 p-3 flex flex-col overflow-y-auto shadow-lg">
      {/* Using w-96 for a fixed width, slate-50 for background, padding, flex-col, scroll, shadow */}
      {children}
    </div>
  );
};


function AppContent() {
  // This component will now have access to useFlowData hook
  return (
    // app-container
    <div className="flex flex-col h-screen">
      <Header />
      {/* main-content */}
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* bottom-area */}
        <div className="flex flex-grow overflow-hidden">
          {/* MapPane will take flex-grow. Assuming MapPane's root div can take className. */}
          <div className="flex-grow"> {/* Wrapper for MapPane to ensure flex-grow applies correctly */}
            <MapPane />
          </div>
          {/* LeftRail will contain SectionDash and OverviewDash */}
          <LeftRail>
            <SectionDash />
            <OverviewDash />
          </LeftRail>
        </div>
        <TimeBar /> {/* TimeBar remains at the bottom of main-content */}
      </div>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <URLStateSync />
      <AppContent />
    </DataProvider>
  );
}

export default App;
