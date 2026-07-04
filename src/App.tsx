import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Map, Gem, BookOpen, CalendarDays, Route, Users, RefreshCw, Printer, Search, MapPinned, Loader2, Menu, X, Edit2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { DestinationData } from './types';

const TRIP_TYPES = ['Solo', 'Couple', 'Family', 'Friends Group'];
const SECTIONS = [
  { id: 'aiCamera', label: 'AI Camera Guide', icon: Camera },
  { id: 'dayPlanner', label: 'AI Smart Day Planner', icon: Clock },
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'attractions', label: 'Local Attractions', icon: Gem },
  { id: 'hiddenGems', label: 'Hidden Gems', icon: MapPinned },
  { id: 'storytelling', label: 'Cultural Story', icon: BookOpen },
  { id: 'events', label: 'Events & Heritage', icon: CalendarDays },
  { id: 'itinerary', label: 'Suggested Itinerary', icon: Route },
  { id: 'connectLocally', label: 'Connect Locally', icon: Users },
  { id: 'mapView', label: 'Map View', icon: Map },
];

export default function App() {
  // Input State
  const [currentLocation, setCurrentLocation] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [tripType, setTripType] = useState(TRIP_TYPES[0]);
  const [duration, setDuration] = useState<number>(3);
  
  // Personalization State
  const [budget, setBudget] = useState('Medium');
  const [foodPreference, setFoodPreference] = useState('Any');
  const [religion, setReligion] = useState('');
  const [adventureLevel, setAdventureLevel] = useState('Medium');
  const [walkingPreference, setWalkingPreference] = useState('Medium');
  const [languages, setLanguages] = useState('');
  const [interests, setInterests] = useState('');

  const [isLocating, setIsLocating] = useState(false);

  // App State
  const [data, setData] = useState<Partial<DestinationData>>({});
  const [activeSection, setActiveSection] = useState('overview');
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  const [errorSections, setErrorSections] = useState<Record<string, string | null>>({});
  
  const [hasSearched, setHasSearched] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Accordion state for itinerary
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 1: true });

  // Camera State
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [cameraResult, setCameraResult] = useState<any>(null);
  const [isAnalyzingCamera, setIsAnalyzingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Day Planner State
  const [dayPlanTime, setDayPlanTime] = useState('6 hours');
  const [dayPlanBudget, setDayPlanBudget] = useState('₹1000');
  const [dayPlanCompanions, setDayPlanCompanions] = useState('parents');
  const [dayPlanResult, setDayPlanResult] = useState<any>(null);
  const [isGeneratingDayPlan, setIsGeneratingDayPlan] = useState(false);
  const [dayPlanError, setDayPlanError] = useState<string | null>(null);

  const generateDayPlan = async () => {
    setIsGeneratingDayPlan(true);
    setDayPlanError(null);
    setDayPlanResult(null);
    try {
      const res = await fetch('/api/generate-day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentLocation, 
          timeAvailable: dayPlanTime, 
          budgetAvailable: dayPlanBudget, 
          travelingWith: dayPlanCompanions 
        }),
      });
      if (!res.ok) throw new Error('Failed to generate day plan. Please try again.');
      const data = await res.json();
      setDayPlanResult(data.plan);
    } catch (err: any) {
      setDayPlanError(err.message);
    } finally {
      setIsGeneratingDayPlan(false);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCameraImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzingCamera(true);
    setCameraError(null);
    setCameraResult(null);
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, currentLocation }),
      });
      if (!res.ok) throw new Error('Failed to analyze image. Please try again.');
      const data = await res.json();
      setCameraResult(data);
    } catch (err: any) {
      setCameraError(err.message);
    } finally {
      setIsAnalyzingCamera(false);
    }
  };

  const fetchSection = async (sectionId: string, isRegenerate = false, locationOverride?: string) => {
    if (sectionId === 'mapView') return; // Map view doesn't need AI generation
    
    setLoadingSections(prev => ({ ...prev, [sectionId]: true }));
    setErrorSections(prev => ({ ...prev, [sectionId]: null }));
    
    try {
      const locToUse = locationOverride || currentLocation;
      const res = await fetch('/api/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentLocation: locToUse, age, tripType, duration, 
          budget, foodPreference, religion, adventureLevel, walkingPreference, languages, interests,
          section: sectionId, isRegenerate 
        }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to generate ${sectionId}.`);
      }
      
      const json = await res.json();
      setData(prev => ({ ...prev, ...json }));
    } catch (err: any) {
      setErrorSections(prev => ({ ...prev, [sectionId]: err.message || 'An error occurred.' }));
    } finally {
      setLoadingSections(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            let locationName = `${latitude}, ${longitude}`;
            const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              if (data.features && data.features.length > 0) {
                 const props = data.features[0].properties;
                 locationName = props.city || props.town || props.county || props.state || locationName;
              }
            } else {
              // Fallback to OSM if backend proxy fails
              const resOs = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (resOs.ok) {
                const data = await resOs.json();
                locationName = data.address.city || data.address.town || data.address.village || data.address.state || locationName;
              }
            }
            
            setCurrentLocation(locationName);
            
            // Auto generate if we have the other details
            if (age && tripType) {
               handleInitialExplore(locationName);
            }
          } catch (e) {
            setCurrentLocation(`${latitude}, ${longitude}`);
          }
          setIsLocating(false);
        },
        (error) => {
          alert("Unable to retrieve your location. Please type it manually.");
          setIsLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleInitialExplore = (overrideLocation?: string | any) => {
    const loc = typeof overrideLocation === 'string' ? overrideLocation : currentLocation;
    if (!loc || !loc.trim()) {
      alert("Please enter your current location.");
      return;
    }
    if (!age || age < 1 || age > 120) {
      alert("Please enter a valid age.");
      return;
    }
    if (duration < 1 || duration > 14) {
      alert("Duration must be between 1 and 14 days.");
      return;
    }

    if (typeof overrideLocation === 'string') {
      setCurrentLocation(overrideLocation);
    }

    setHasSearched(true);
    setIsEditModalOpen(false);
    setData({});
    setActiveSection('overview');
    
    // Reset accordions
    setOpenDays({ 1: true });
    
    // Fetch overview immediately
    fetchSection('overview', false, loc);
    // Progressively load other sections in background
    setTimeout(() => fetchSection('attractions', false, loc), 1000);
    setTimeout(() => fetchSection('hiddenGems', false, loc), 2000);
    setTimeout(() => fetchSection('storytelling', false, loc), 3000);
    setTimeout(() => fetchSection('events', false, loc), 4000);
    setTimeout(() => fetchSection('itinerary', false, loc), 5000);
    setTimeout(() => fetchSection('connectLocally', false, loc), 6000);
  };

  // Effect to load section content when navigating
  useEffect(() => {
    if (hasSearched && activeSection !== 'mapView' && !data[activeSection as keyof DestinationData] && !loadingSections[activeSection]) {
      fetchSection(activeSection);
    }
  }, [activeSection, hasSearched]);

  const handlePrint = () => {
    window.print();
  };
  
  const toggleDayAccordion = (day: number) => {
    setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const renderSearchForm = (isModal = false) => (
    <div className={`space-y-8 ${!isModal ? 'bg-white rounded-2xl p-8 shadow-sm border border-[var(--color-border-light)]' : ''}`}>
      
      {/* Location */}
      <div>
        <h3 className="text-lg font-medium text-[var(--color-primary)] mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-[var(--color-accent)]" /> 
          Where are you right now?
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. Kyoto, Japan or click Locate Me ->"
              className="w-full pl-4 pr-32 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
            <button 
              onClick={handleLocateMe}
              disabled={isLocating}
              className="absolute right-2 top-2 bottom-2 bg-[var(--color-bg)] hover:bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium text-xs px-3 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLocating ? <Loader2 size={14} className="animate-spin" /> : <MapPinned size={14} />}
              {isLocating ? 'Locating...' : 'Locate Me'}
            </button>
          </div>
        </div>
      </div>

      {/* About You */}
      <div>
        <h3 className="text-lg font-medium text-[var(--color-primary)] mb-4 flex items-center gap-2">
          <Users size={20} className="text-[var(--color-accent)]" /> 
          About You
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Your Age</label>
            <input
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || '')}
              placeholder="e.g. 28"
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Who is traveling?</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm bg-white transition-shadow"
            >
              {TRIP_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">How many days?</label>
            <input
              type="number"
              min="1"
              max="14"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Budget</label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm bg-white transition-shadow"
            >
              <option value="Low">Low (Backpacker)</option>
              <option value="Medium">Medium</option>
              <option value="High">High (Luxury)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Food Preference</label>
            <select
              value={foodPreference}
              onChange={(e) => setFoodPreference(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm bg-white transition-shadow"
            >
              <option value="Any">Any</option>
              <option value="Veg">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Non-Veg">Non-Vegetarian</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Adventure Level</label>
            <select
              value={adventureLevel}
              onChange={(e) => setAdventureLevel(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm bg-white transition-shadow"
            >
              <option value="Low">Low (Relaxed)</option>
              <option value="Medium">Medium</option>
              <option value="High">High (Active)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Walking</label>
            <select
              value={walkingPreference}
              onChange={(e) => setWalkingPreference(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm bg-white transition-shadow"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High (Lots of walking)</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Religion / Beliefs (Optional)</label>
            <input
              type="text"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              placeholder="e.g. Halal only, Hindu..."
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Languages (Optional)</label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="e.g. English, Spanish..."
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Special Interests (Optional)</label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. Photography, Art..."
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[var(--color-border-light)]">
        <button
          onClick={handleInitialExplore}
          className="bg-[var(--color-accent)] text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-opacity-90 transition-opacity w-full md:w-auto justify-center shadow-sm"
        >
          <Search size={18} />
          {hasSearched ? 'Update Discovery' : 'Discover Around Me'}
        </button>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse mt-2">
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6 mb-6"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );

  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 py-12">
        <div className="max-w-4xl w-full mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 text-[var(--color-accent)] mb-6">
              <img src="/logo.jpg" alt="Culture Compass" className="w-16 h-16 rounded-xl shadow-sm" />
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[var(--color-primary)] mb-4">Welcome to CultureCompass</h1>
            <p className="text-lg md:text-xl text-[var(--color-secondary)] max-w-2xl mx-auto leading-relaxed">
              Where is your next adventure taking you? Let's craft a personalized cultural journey.
            </p>
          </div>
          {renderSearchForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)]">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[var(--color-border-light)] sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <img src="/logo.jpg" alt="Culture Compass" className="w-6 h-6 rounded-md" />
          <h1 className="text-lg font-medium tracking-tight text-[var(--color-primary)]">CultureCompass</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[var(--color-primary)] p-1">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Fixed on desktop */}
      <aside className={`no-print fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 z-10 w-64 bg-[var(--color-sidebar)] border-r border-[var(--color-border-light)] flex-shrink-0 md:h-screen md:sticky md:top-0 overflow-y-auto transition-transform duration-200 ease-in-out`}>
        <div className="p-6">
          <div className="hidden md:flex items-center gap-2 text-[var(--color-accent)] mb-8">
            <img src="/logo.jpg" alt="Culture Compass" className="w-8 h-8 rounded-lg shadow-sm" />
            <h1 className="text-xl font-medium tracking-tight text-[var(--color-primary)]">CultureCompass</h1>
          </div>
          
          <nav className="space-y-1.5 mb-8">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm font-medium
                    ${isActive 
                      ? 'bg-[var(--color-accent-subtle)] text-[var(--color-primary)] shadow-[inset_3px_0_0_0_var(--color-accent)]' 
                      : 'text-[var(--color-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)]'
                    }`}
                >
                  <Icon size={18} />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="bg-white rounded-xl p-4 border border-[var(--color-border-light)] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-secondary)]">Trip Summary</h3>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="text-[var(--color-accent)] hover:text-[var(--color-primary)] transition-colors p-1"
                title="Edit Search"
              >
                <Edit2 size={14} />
              </button>
            </div>
            <p className="font-medium text-[var(--color-primary)] mb-1 truncate" title={currentLocation}>
              {currentLocation}
            </p>
            <p className="text-sm text-[var(--color-secondary)] mb-3">{age} yrs • {tripType} • {duration} Days</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto print-content">
        <div className="p-6 md:p-10 max-w-5xl mx-auto w-full transition-opacity duration-150 ease-in-out">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8 no-print">
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-[var(--color-primary)] flex items-center gap-3">
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>
            <div className="flex gap-3">
              {activeSection !== 'mapView' && (
                <button
                  onClick={() => fetchSection(activeSection, true)}
                  disabled={loadingSections[activeSection]}
                  className="hidden md:flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] bg-transparent hover:bg-[var(--color-accent-subtle)] px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={loadingSections[activeSection] ? "animate-spin" : ""} /> 
                  Regenerate
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] bg-white shadow-sm"
              >
                <Printer size={16} /> Export Itinerary
              </button>
            </div>
          </div>

          {/* Print-only title */}
          <div className="print-only hidden mb-8 text-center pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-medium mb-2">{currentLocation}</h1>
            <p className="text-gray-500">{age} years old • {tripType} Trip • {duration} Days</p>
          </div>

          {/* Mobile regenerate button */}
          {activeSection !== 'mapView' && (
            <div className="mb-6 md:hidden no-print">
              <button
                onClick={() => fetchSection(activeSection, true)}
                disabled={loadingSections[activeSection]}
                className="w-full flex justify-center items-center gap-2 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] bg-transparent active:bg-[var(--color-accent-subtle)] px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={loadingSections[activeSection] ? "animate-spin" : ""} /> 
                Regenerate Section
              </button>
            </div>
          )}

          {errorSections[activeSection] && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium">
              {errorSections[activeSection]}
              <button onClick={() => fetchSection(activeSection)} className="ml-4 underline">Try again</button>
            </div>
          )}

          {/* Content Area */}
          <div className={`transition-opacity duration-150 ${loadingSections[activeSection] ? 'opacity-50' : 'opacity-100'}`}>
            {loadingSections[activeSection] && !data[activeSection as keyof DestinationData] ? (
              renderSkeleton()
            ) : (
              <div className="pb-16">
                {activeSection === 'aiCamera' && (
                  <div className="space-y-6 print-only:block max-w-3xl mx-auto">
                    <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 shadow-sm text-center">
                      <div className="mb-6 flex justify-center">
                        <div className="bg-[var(--color-accent-subtle)] text-[var(--color-accent)] p-6 rounded-full inline-block">
                          <Camera size={48} strokeWidth={1.5} />
                        </div>
                      </div>
                      <h3 className="text-xl font-medium text-[var(--color-primary)] mb-2">Identify Anything</h3>
                      <p className="text-[var(--color-secondary)] mb-8">
                        Snap a photo of a monument, street, food, temple, or artwork. Our AI will tell you its story.
                      </p>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleCameraCapture}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingCamera}
                        className="bg-[var(--color-accent)] text-white px-8 py-3 rounded-lg font-medium inline-flex items-center gap-2 hover:bg-opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                      >
                        {isAnalyzingCamera ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                        {isAnalyzingCamera ? 'Analyzing...' : 'Open Camera'}
                      </button>
                    </div>

                    {cameraError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg text-sm font-medium">
                        {cameraError}
                      </div>
                    )}

                    {cameraImage && !isAnalyzingCamera && cameraResult && (
                      <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                        <div className="w-full md:w-1/3 bg-gray-100">
                          <img src={cameraImage} alt="Captured" className="w-full h-full object-cover min-h-[200px]" />
                        </div>
                        <div className="w-full md:w-2/3 p-6 space-y-4">
                          <h3 className="text-2xl font-medium text-[var(--color-primary)] border-b border-[var(--color-border-light)] pb-4">
                            {cameraResult.name}
                          </h3>
                          
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-1">History</h4>
                            <p className="text-sm text-[var(--color-primary)] leading-relaxed">{cameraResult.history}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-1">Cultural Significance</h4>
                            <p className="text-sm text-[var(--color-primary)] leading-relaxed">{cameraResult.culturalSignificance}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-1">Hidden Facts</h4>
                            <p className="text-sm text-[var(--color-primary)] leading-relaxed">{cameraResult.hiddenFacts}</p>
                          </div>
                          
                          <div className="bg-[var(--color-bg)] border border-[var(--color-border-light)] rounded-lg p-4 flex items-start gap-3 mt-4">
                            <CalendarDays className="text-[var(--color-accent)] mt-0.5 flex-shrink-0" size={18} />
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-secondary)] mb-0.5">Best Time To Visit</h4>
                              <p className="text-sm text-[var(--color-primary)] font-medium">{cameraResult.bestTimeToVisit}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'dayPlanner' && (
                  <div className="space-y-6 print-only:block max-w-3xl mx-auto">
                    <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-[var(--color-border-light)] pb-4">
                        <div className="bg-[var(--color-accent-subtle)] text-[var(--color-accent)] p-3 rounded-lg">
                          <Clock size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-medium text-[var(--color-primary)]">AI Smart Day Planner</h3>
                          <p className="text-sm text-[var(--color-secondary)]">Optimize your day instantly based on constraints.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Time Available</label>
                          <input
                            type="text"
                            value={dayPlanTime}
                            onChange={(e) => setDayPlanTime(e.target.value)}
                            placeholder="e.g. 6 hours"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Budget</label>
                          <input
                            type="text"
                            value={dayPlanBudget}
                            onChange={(e) => setDayPlanBudget(e.target.value)}
                            placeholder="e.g. ₹1000"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">Traveling With</label>
                          <input
                            type="text"
                            value={dayPlanCompanions}
                            onChange={(e) => setDayPlanCompanions(e.target.value)}
                            placeholder="e.g. Parents"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] text-sm transition-shadow"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={generateDayPlan}
                        disabled={isGeneratingDayPlan || !dayPlanTime || !dayPlanBudget || !dayPlanCompanions}
                        className="w-full bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                      >
                        {isGeneratingDayPlan ? <Loader2 className="animate-spin" size={18} /> : <Clock size={18} />}
                        {isGeneratingDayPlan ? 'Generating Plan...' : 'Generate Smart Plan'}
                      </button>
                    </div>

                    {dayPlanError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg text-sm font-medium">
                        {dayPlanError}
                      </div>
                    )}

                    {dayPlanResult && !isGeneratingDayPlan && (
                      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-6 shadow-sm">
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--color-border-light)] before:via-[var(--color-border-light)] before:to-transparent">
                          {dayPlanResult.map((item: any, idx: number) => (
                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[var(--color-accent)] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <Clock size={16} />
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[var(--color-border-light)] bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-bold text-[var(--color-primary)]">{item.activity}</h4>
                                </div>
                                <time className="block text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-2">{item.time}</time>
                                <p className="text-sm text-[var(--color-secondary)] leading-relaxed">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'overview' && data.overview && (
                  <div className="bg-white p-6 md:p-8 rounded-xl border border-[var(--color-border-light)] shadow-sm print-only:block">
                    <p className="text-lg md:text-xl font-medium text-[var(--color-accent)] leading-relaxed">
                      {data.overview}
                    </p>
                  </div>
                )}

                {activeSection === 'attractions' && data.attractions && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-only:block">
                    {data.attractions.map((item, idx) => (
                      <div key={idx} className="flex flex-col p-5 rounded-xl border border-[var(--color-border-light)] bg-white shadow-sm h-full">
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <h3 className="text-lg font-medium text-[var(--color-primary)]">{item.name}</h3>
                          <span className="text-[10px] font-medium px-2 py-1 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] rounded-full whitespace-nowrap">
                            {item.relevanceTag}
                          </span>
                        </div>
                        <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-4 flex-1">{item.description}</p>
                        <div className="text-xs font-medium text-[var(--color-primary)] pt-3 border-t border-[var(--color-border-light)] flex items-center gap-2">
                          ⏱ {item.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'hiddenGems' && data.hiddenGems && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-only:block">
                    {data.hiddenGems.map((gem, idx) => (
                      <div key={idx} className="p-6 rounded-xl border border-[var(--color-border-light)] bg-white shadow-sm flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 text-[var(--color-accent)]">
                          <Gem size={18} />
                          <h3 className="text-lg font-medium text-[var(--color-primary)]">{gem.name}</h3>
                        </div>
                        <p className="text-[var(--color-secondary)] text-sm mb-5 flex-1 leading-relaxed">{gem.whySpecial}</p>
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border-light)]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] block mb-1">Local Tip</span>
                          <p className="text-sm text-[var(--color-primary)] italic">"{gem.localTip}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'storytelling' && data.storytelling && (
                  <div className="bg-white p-6 md:p-10 rounded-xl border border-[var(--color-border-light)] shadow-sm print-only:block">
                    <div className="max-w-3xl mx-auto space-y-6 text-[var(--color-primary)] leading-loose text-lg">
                      {data.storytelling.split('\n').filter(Boolean).map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'events' && data.events && (
                  <div className="space-y-6 print-only:block max-w-3xl mx-auto">
                    {data.events.map((evt, idx) => (
                      <div key={idx} className="bg-white border border-[var(--color-border-light)] rounded-xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--color-accent)]"></div>
                        <h3 className="text-lg font-medium mb-2 pl-2">{evt.name}</h3>
                        <div className="text-sm font-medium text-[var(--color-secondary)] mb-4 flex items-center gap-2 pl-2">
                          <CalendarDays size={16} /> {evt.bestTimeToAttend}
                        </div>
                        <p className="text-[var(--color-primary)] text-sm leading-relaxed pl-2">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'itinerary' && data.itinerary && (
                  <div className="space-y-4 print-only:block max-w-4xl mx-auto">
                    {data.itinerary.map((dayPlan, idx) => (
                      <div key={idx} className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm">
                        <button 
                          onClick={() => toggleDayAccordion(dayPlan.day)}
                          className="w-full bg-[var(--color-sidebar)] px-6 py-4 flex justify-between items-center transition-colors hover:bg-[var(--color-bg)]"
                        >
                          <h3 className="text-lg font-medium text-[var(--color-primary)]">Day {dayPlan.day}</h3>
                          <div className="text-[var(--color-secondary)]">
                            {openDays[dayPlan.day] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </button>
                        
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-y md:divide-y-0 divide-[var(--color-border-light)] transition-all duration-300 ease-in-out ${openDays[dayPlan.day] ? 'block' : 'hidden print:block'}`}>
                          <div className="p-6">
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-4 flex items-center gap-2">
                              Morning
                            </h4>
                            <ul className="space-y-3">
                              {dayPlan.morning.map((item, i) => (
                                <li key={i} className="text-sm text-[var(--color-primary)] flex gap-2.5 items-start">
                                  <span className="text-[var(--color-accent)] mt-1 text-xs">◆</span> <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-6">
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-4 flex items-center gap-2">
                              Afternoon
                            </h4>
                            <ul className="space-y-3">
                              {dayPlan.afternoon.map((item, i) => (
                                <li key={i} className="text-sm text-[var(--color-primary)] flex gap-2.5 items-start">
                                  <span className="text-[var(--color-accent)] mt-1 text-xs">◆</span> <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-6">
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)] mb-4 flex items-center gap-2">
                              Evening
                            </h4>
                            <ul className="space-y-3">
                              {dayPlan.evening.map((item, i) => (
                                <li key={i} className="text-sm text-[var(--color-primary)] flex gap-2.5 items-start">
                                  <span className="text-[var(--color-accent)] mt-1 text-xs">◆</span> <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'connectLocally' && data.connectLocally && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-only:block">
                    {data.connectLocally.map((exp, idx) => (
                      <div key={idx} className="p-6 rounded-xl border border-[var(--color-border-light)] bg-white shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-[var(--color-accent-subtle)] p-2.5 rounded-lg text-[var(--color-accent)]">
                            <Users size={20} />
                          </div>
                          <h3 className="text-lg font-medium text-[var(--color-primary)]">{exp.name}</h3>
                        </div>
                        <p className="text-[var(--color-secondary)] text-sm mb-5 flex-1 leading-relaxed">{exp.description}</p>
                        <div className="text-sm text-[var(--color-primary)] bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border-light)]">
                          <span className="font-medium text-[var(--color-accent)] block mb-1 text-xs uppercase tracking-wider">Why it's meaningful</span> 
                          <span className="leading-relaxed italic">"{exp.meaningfulReason}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeSection === 'mapView' && (
                  <div className="bg-white rounded-xl border border-[var(--color-border-light)] shadow-sm overflow-hidden h-[60vh] min-h-[400px]">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(currentLocation)}&output=embed`}
                      title={`Map of ${currentLocation}`}
                    ></iframe>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Search Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-[var(--color-border-light)] sticky top-0 bg-white z-10">
              <h2 className="text-xl font-medium text-[var(--color-primary)]">Edit Trip Details</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {renderSearchForm(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

