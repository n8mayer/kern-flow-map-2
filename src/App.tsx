import './App.css';
import { DataProvider } from './data/DataProvider'; // Ensure this path is correct
import MapPane from './components/MapPane'; // Added import
import TimeBar from './components/TimeBar'; // Added import
import SectionDash from './components/SectionDash'; // Added import
import OverviewDash from './components/OverviewDash'; // Added import
import URLStateSync from './routing/URLStateSync'; // Added import

// Placeholders for components - Assuming these are defined or imported elsewhere
// For simplicity, defining them here if not already.
// Ensure these definitions are consistent with your actual component structure.
const Header = () => <header style={{padding: '10px', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Kern Flow</header>;

// Mock components for SectionDash, etc.
// In a real app, these would be imported from './components/...'
// const MapPanePlaceholder = () => <div style={{ height: '60vh', border: '1px solid #ccc', margin: '5px', backgroundColor: '#e9e9e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MapPane Placeholder</div>; // Removed
// const SectionDashPlaceholder = () => <div style={{ flex: 1, border: '1px solid #ccc', margin: '5px', backgroundColor: '#f9f9f9', padding: '10px' }}>SectionDash Placeholder</div>; // Removed
// const OverviewDashPlaceholder = () => <div style={{ flex: 1, border: '1px solid #ccc', margin: '5px', backgroundColor: '#f9f9f9', padding: '10px' }}>OverviewDash Placeholder</div>; // Removed
// const TimeBarPlaceholder = () => <div style={{ border: '1px solid #ccc', margin: '5px', padding: '10px', backgroundColor: '#e9e9e9', textAlign: 'center' }}>TimeBar Placeholder</div>; // Removed
const LeftRailPlaceholder = () => <div style={{ width: '120px', borderRight: '1px solid #ccc', margin: '5px', backgroundColor: '#f0f0f0', padding: '10px' }}>Left Rail</div>;


function AppContent() {
  // This component will now have access to useFlowData hook
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <MapPane /> {/* Replaced placeholder */}
        <div className="bottom-area" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          <LeftRailPlaceholder />
          <div className="dashboards" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <SectionDash /> {/* Replaced placeholder */}
            <OverviewDash /> {/* Replaced placeholder */}
          </div>
        </div>
        <TimeBar /> {/* Replaced placeholder */}
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
