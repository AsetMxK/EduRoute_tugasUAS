import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import MapView from './components/MapView';
import MapOverlay from './components/MapOverlay';
import LandingIntro from './components/LandingIntro';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const App = () => {
  const [showMap, setShowMap] = useState(false);
  const [layersState, setLayersState] = useState({
    schoolAreas: true,
    busRoutes: false, // Hidden by default
    busStops: true,
    roads: false,
    routingPoints: false, // Debug layer for navigation points
  });

  const [schools, setSchools] = useState([]);
  const [schoolAreas, setSchoolAreas] = useState([]);
  const [busStops, setBusStops] = useState([]);
  const [busStopAreas, setBusStopAreas] = useState([]);
  const [busRoutes, setBusRoutes] = useState([]);

  const [roads, setRoads] = useState(null); // Roads GeoJSON
  const [routeData, setRouteData] = useState(null); // { path, distance_meters, duration_minutes }
  const [startPoint, setStartPoint] = useState(null); // Lifted state for User Location
  const [selectedSchool, setSelectedSchool] = useState(null); // Lifted state for Target School
  const [routePreference, setRoutePreference] = useState('recommended'); // 'recommended' (fastest) or 'shortest'
  const [comparisonResults, setComparisonResults] = useState(null); // { walk, private, bus }
  const [busTransportMode, setBusTransportMode] = useState('walk'); // Selected transport mode to bus stop

  // Fetch Data Global
  const dataFetchedRef = useRef(false);
  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const fetchData = async () => {
      try {
        const [gisRes, roadsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/gis-data'),
          axios.get('http://localhost:5000/api/roads')
        ]);

        // Response format: { schools, schoolAreas, busStops, busStopAreas, busRoutes }
        setSchools(gisRes.data.schools.features);
        setSchoolAreas(gisRes.data.schoolAreas.features);
        setBusStops(gisRes.data.busStops.features);
        setBusStopAreas(gisRes.data.busStopAreas.features);
        setBusRoutes(gisRes.data.busRoutes.features);

        setRoads(roadsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data dari server.");
      }
    };
    fetchData();
  }, []);

  const handleStart = () => {
    // Animasi transisi keluar Landing page
    gsap.to(".landing-container", {
      y: "-100%",
      duration: 1,
      ease: "power4.inOut",
      onComplete: () => setShowMap(true)
    });
  };

  const handleToggleLayer = (layerName) => {
    setLayersState(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const handleRouteFound = (data) => {
    console.log("Route Found:", data);
    setRouteData(data);
  };

  // Function to change bus transport mode and update route display
  const handleChangeBusMode = (mode) => {
    if (!comparisonResults?.bus || !comparisonResults.bus.modeOptions) return;

    setBusTransportMode(mode);
    const modeData = comparisonResults.bus.modeOptions[mode];

    // Update routeData with the selected mode
    const updatedBusData = {
      ...comparisonResults.bus,
      selectedMode: mode,
      walkPath: modeData.path, // Update the path to stop
      path: [...modeData.path, ...comparisonResults.bus.busLinePath], // Combine with bus line
      distance_meters: modeData.distance,
      duration_minutes: modeData.duration
    };

    setRouteData(updatedBusData);
  };

  // Centralized Route Finding Logic (Multi-Mode)
  const handleFindRoute = async (targetSchool) => {
    if (!startPoint) {
      alert("Lokasi Anda belum ditentukan! Klik pada peta.");
      return;
    }

    if (!targetSchool) {
      alert("Pilih sekolah tujuan terlebih dahulu!");
      return;
    }

    // Extract coordinates from targetSchool
    const geometry = targetSchool.properties?.routingLocation || targetSchool.geometry;
    const [schoolLon, schoolLat] = geometry.coordinates;
    const userLat = startPoint.lat;
    const userLon = startPoint.lng;

    // Helper Haversine
    const calculateDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // meters
      const rad = Math.PI / 180;
      const dLat = (lat2 - lat1) * rad;
      const dLon = (lon2 - lon1) * rad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distToSchool = calculateDist(userLat, userLon, schoolLat, schoolLon);
    toast.info(`Mencari 3 Rute Alternatif...`, { duration: 2000 });

    const fetchDirectRoute = async (profile) => {
      try {
        const payload = {
          startLat: userLat,
          startLon: userLon,
          endLat: parseFloat(schoolLat),
          endLon: parseFloat(schoolLon),
          preference: routePreference,
          profile: profile
        };
        const response = await axios.post('http://localhost:5000/api/ors/directions', payload);
        const orsData = response.data;
        if (orsData.features && orsData.features.length > 0) {
          const routeFeature = orsData.features[0];
          const coordinates = routeFeature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          const summary = routeFeature.properties.summary;
          return {
            path: coordinates,
            distance_meters: summary.distance,
            duration_minutes: summary.duration / 60,
            summary: summary
          };
        }
        return null;
      } catch (e) {
        console.error(`Error fetching ${profile}`, e);
        return null;
      }
    };

    // 1. Walk Option
    const walkPromise = fetchDirectRoute('foot-walking');

    // 2. Private Vehicle Option
    const privatePromise = fetchDirectRoute('driving-car');

    // 3. Smart Bus Option (Route to Stop + Display Bus Line)
    const busPromise = (async () => {
      // 1. Check if target school has any serving bus routes
      const schoolRouteIds = selectedSchool.properties.routeIds || [];
      if (schoolRouteIds.length === 0) {
        console.log("This school has no bus routes serving it.");
        return null;
      }

      // 2. Filter bus stops that belong to these school routes
      const validStops = busStops.filter(stop => {
        const stopRouteIds = stop.properties.routeIds || [];
        // Check if this stop serves any of the school's routes
        return stopRouteIds.some(rid => schoolRouteIds.includes(rid));
      });

      if (validStops.length === 0) {
        console.log("No bus stops found for this school's routes.");
        return null;
      }

      // 3. Find nearest valid stop to User
      let nearestStop = null;
      let minDist = Infinity;

      validStops.forEach(stop => {
        const [lon, lat] = stop.geometry.coordinates;
        const d = calculateDist(userLat, userLon, lat, lon);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
        }
      });

      if (!nearestStop) {
        console.log("Could not find nearest stop.");
        return null;
      }

      // 4. Pick the common route between stop and school
      const stopRouteIds = nearestStop.properties.routeIds || [];
      const commonRouteId = stopRouteIds.find(rid => schoolRouteIds.includes(rid));

      const busRoute = busRoutes.find(r => r.properties.id === commonRouteId);

      if (!busRoute) {
        console.log(`Bus route ${commonRouteId} not found in busRoutes state.`);
        return null;
      }

      const [stopLon, stopLat] = nearestStop.geometry.coordinates;

      try {
        // Calculate 3 transport modes to the bus stop (User → Stop)
        const [walkRes, carRes, motorRes] = await Promise.all([
          // 1. Walking
          axios.post('http://localhost:5000/api/ors/directions', {
            startLat: userLat,
            startLon: userLon,
            endLat: stopLat,
            endLon: stopLon,
            profile: 'foot-walking'
          }),
          // 2. Car (diantar orang tua)
          axios.post('http://localhost:5000/api/ors/directions', {
            startLat: userLat,
            startLon: userLon,
            endLat: stopLat,
            endLon: stopLon,
            profile: 'driving-car'
          }),
          // 3. Motorcycle
          axios.post('http://localhost:5000/api/ors/directions', {
            startLat: userLat,
            startLon: userLon,
            endLat: stopLat,
            endLon: stopLon,
            profile: 'cycling-electric' // Using cycling-electric to allow alley access like motor
          })
        ]);

        const walkData = walkRes.data.features[0];
        const carData = carRes.data.features[0];
        const motorData = motorRes.data.features[0];

        const walkCoords = walkData.geometry.coordinates.map(c => [c[1], c[0]]);
        const carCoords = carData.geometry.coordinates.map(c => [c[1], c[0]]);
        const motorCoords = motorData.geometry.coordinates.map(c => [c[1], c[0]]);

        // Get Bus Route Line (MultiLineString → use first line)
        const busGeometry = busRoute.geometry;
        let busLineCoords = [];

        if (busGeometry.type === 'MultiLineString') {
          busLineCoords = busGeometry.coordinates[0].map(c => [c[1], c[0]]);
        } else if (busGeometry.type === 'LineString') {
          busLineCoords = busGeometry.coordinates.map(c => [c[1], c[0]]);
        }

        // Prepare 3 mode options
        const modeOptions = {
          walk: {
            path: walkCoords,
            distance: walkData.properties.summary.distance,
            duration: walkData.properties.summary.duration / 60,
            data: walkData
          },
          car: {
            path: carCoords,
            distance: carData.properties.summary.distance,
            duration: carData.properties.summary.duration / 60,
            data: carData
          },
          motor: {
            path: motorCoords,
            distance: motorData.properties.summary.distance,
            duration: motorData.properties.summary.duration / 60,
            data: motorData
          }
        };

        // Default to walking mode
        const defaultMode = 'walk';
        const selectedModeData = modeOptions[defaultMode];

        // Combine paths for display (selected mode to stop + bus line visualization)
        const combinedPath = [...selectedModeData.path, ...busLineCoords];

        // Return with all mode options
        return {
          path: combinedPath, // Combined for overall route display
          walkPath: selectedModeData.path, // Selected mode segment
          busLinePath: busLineCoords, // Bus route line only
          distance_meters: selectedModeData.distance, // Selected mode distance
          duration_minutes: selectedModeData.duration, // Selected mode time
          modeOptions: modeOptions, // All 3 mode options
          selectedMode: defaultMode, // Currently selected mode
          legs: { toStop: selectedModeData.data, busLine: busRoute },
          stopName: nearestStop.properties.name,
          routeName: busRoute.properties.name,
          isBusRoute: true // Flag to indicate this includes bus line display
        };
      } catch (e) {
        console.error("Error in bus routing", e);
        return null;
      }
    })();

    // Wait for all
    try {
      const [walkResult, privateResult, busResult] = await Promise.all([walkPromise, privatePromise, busPromise]);

      // Construct Result Object
      const results = {
        walk: walkResult,
        private: privateResult,
        bus: busResult
      };

      setComparisonResults(results);

      // Auto-Select Logic
      let bestOption = 'private'; // Default fallback
      if (distToSchool < 100 && walkResult) bestOption = 'walk';
      else if (busResult && privateResult && busResult.duration_minutes < privateResult.duration_minutes * 1.5) bestOption = 'bus'; // If bus is comparable
      else if (privateResult) bestOption = 'private';

      const selectedData = results[bestOption];
      if (selectedData) {
        setRouteData(selectedData);
        toast.success(`Rute ${bestOption.toUpperCase()} dipilih otomatis.`);
      } else {
        // If best option failed, try others
        if (walkResult) setRouteData(walkResult);
        else if (privateResult) setRouteData(privateResult);
        else toast.error("Tidak ada rute ditemukan.");
      }

    } catch (e) {
      console.error("Error aggregating routes", e);
      toast.error("Gagal mencari rute.");
    }
  };

  // Reset/Clear State
  const handleReset = () => {
    setStartPoint(null);
    setSelectedSchool(null);
    setRouteData(null);
    console.log("State reset");
  };

  // Function to fly to school (passed to overlay)
  const handleSelectSchool = (school) => {
    console.log("Selected School:", school.properties.name);
    // TODO: Implement FlyTo logic in MapView if needed
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-slate-900 bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900">

      {/* Landing Page Overlay */}
      <div className="landing-container absolute inset-0 z-50">
        <LandingIntro onStart={handleStart} />
      </div>

      {/* Main Map Container */}
      {showMap && (
        <div className="absolute inset-0 transition-opacity duration-1000 delay-500">
          <MapOverlay
            onSearchRoute={() => handleFindRoute(selectedSchool)}
            toggleLayer={handleToggleLayer}
            layersState={layersState}
            routeData={routeData}
            schools={schools}
            onSelectSchool={(school) => {
              handleSelectSchool(school);
              setSelectedSchool(school);
            }}
            startPoint={startPoint}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
            onReset={handleReset}
            routePreference={routePreference}
            setRoutePreference={setRoutePreference}
            comparisonResults={comparisonResults}
            onSelectResult={(res) => setRouteData(res)}
            busTransportMode={busTransportMode}
            onChangeBusMode={handleChangeBusMode}
          />

          <MapView
            layersState={layersState}
            schools={schools}
            schoolAreas={schoolAreas}
            busStops={busStops}
            busStopAreas={busStopAreas}
            busRoutes={busRoutes}
            roads={roads}
            startPoint={startPoint}
            setStartPoint={setStartPoint}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
            onRouteFound={handleRouteFound}
            currentRoutePath={routeData?.path || []}
            routeData={routeData} // Pass full route data for color differentiation
            lastMilePath={routeData?.lastMilePath}
          />
        </div>
      )}

      <Toaster />
    </div>
  );
};

export default App;
