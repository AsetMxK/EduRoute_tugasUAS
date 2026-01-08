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

  const [nearestTerminal, setNearestTerminal] = useState(null);

  // Centralized Route Finding Logic - Find Bus Route for School (No User Location Needed)
  const handleFindRoute = async (targetSchool) => {
    if (!startPoint) {
      toast.error("Lokasi Anda belum ditentukan! Klik pada peta untuk set lokasi pointer.");
      return;
    }

    if (!targetSchool) {
      toast.error("Pilih sekolah tujuan terlebih dahulu!");
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
    toast.info(`Mencari Rute & Terminal Terdekat...`, { duration: 2000 });

    let apiNearestTerminal = null;

    // 1. Find Nearest Terminal Logic
    try {
      const terminalRes = await axios.get('http://localhost:5000/api/nearest-terminals', {
        params: {
          lat: userLat,
          lon: userLon,
          schoolId: targetSchool.properties.id,
          limit: 1,
          radius: 3000 // Mencari dalam radius 3km dari titik (node) user
        }
      });

      if (terminalRes.data.terminals.length > 0) {
        apiNearestTerminal = terminalRes.data.terminals[0];
        setNearestTerminal(apiNearestTerminal);
        toast.success(`Ditemukan Terminal: ${apiNearestTerminal.name}`);
      } else {
        setNearestTerminal(null);
      }
    } catch (e) {
      console.error("Error finding terminal", e);
    }

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
      const schoolRouteIds = targetSchool.properties.routeIds || [];
      if (schoolRouteIds.length === 0) {
        console.warn("School has no bus routes");
        return null; // Silent fail for bus, will fall back to walk
      }

      let nearestStop = null;

      // 2. Use API result if available
      if (apiNearestTerminal) {
        nearestStop = {
          properties: {
            id: apiNearestTerminal.id,
            name: apiNearestTerminal.name,
            routeIds: apiNearestTerminal.routeIds
          },
          geometry: apiNearestTerminal.location
        };
      } else {
        // Fallback Search
        // ... (existing logic) ...
      }

      if (!nearestStop) {
        console.warn("No nearest bus stop found even after search.");
        return null;
      }



      // 4. Pick the common route between stop and school
      const stopRouteIds = nearestStop.properties.routeIds || [];
      const commonRouteId = stopRouteIds.find(rid => schoolRouteIds.includes(rid));

      const busRoute = busRoutes.find(r => r.properties.id === commonRouteId);

      if (!busRoute) return null;

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

        // 5. Find End Stop (Bus Stop closest to School on this route)
        const routeStops = busStops.filter(s => {
          const sRoutes = s.properties.routeIds || [];
          return sRoutes.includes(commonRouteId);
        });

        let endStop = null;
        let minSchoolDist = Infinity;
        routeStops.forEach(s => {
          const [slon, slat] = s.geometry.coordinates;
          const d = calculateDist(parseFloat(schoolLat), parseFloat(schoolLon), slat, slon);
          if (d < minSchoolDist) {
            minSchoolDist = d;
            endStop = s;
          }
        });

        let lastMileCoords = [];
        let lastMileDistance = 0;
        let lastMileDuration = 0;

        // Calculate Last Mile (Walk from End Stop to School)
        if (endStop) {
          try {
            const [elon, elat] = endStop.geometry.coordinates;
            // Don't calculate if very close (e.g. stop is AT school)
            if (minSchoolDist > 20) {
              const lastMileRes = await axios.post('http://localhost:5000/api/ors/directions', {
                startLat: elat,
                startLon: elon,
                endLat: parseFloat(schoolLat),
                endLon: parseFloat(schoolLon),
                profile: 'foot-walking'
              });

              if (lastMileRes.data.features && lastMileRes.data.features.length > 0) {
                const lmFeature = lastMileRes.data.features[0];
                lastMileCoords = lmFeature.geometry.coordinates.map(c => [c[1], c[0]]);
                lastMileDistance = lmFeature.properties.summary.distance;
                lastMileDuration = lmFeature.properties.summary.duration / 60;
              }
            }
          } catch (err) {
            console.warn("Last mile calculation failed", err);
          }
        }

        // Return with all mode options
        return {
          path: [...selectedModeData.path, ...busLineCoords, ...lastMileCoords], // Combined for overall route display
          walkPath: selectedModeData.path, // Selected mode segment
          busLinePath: busLineCoords, // Bus route line only
          lastMilePath: lastMileCoords, // Walking segment from bus to school
          distance_meters: selectedModeData.distance + lastMileDistance, // Total distance (walking parts)
          duration_minutes: selectedModeData.duration + lastMileDuration + 15, // +15 mins est. bus wait/travel (simple heuristic)
          modeOptions: modeOptions, // All 3 mode options
          selectedMode: defaultMode, // Currently selected mode
          legs: { toStop: selectedModeData.data, busLine: busRoute },
          stopName: nearestStop.properties.name,
          endStopName: endStop ? endStop.properties.name : 'Sekolah',
          routeName: busRoute.properties.name,
          isBusRoute: true // Flag to indicate this includes bus line display
        };
      } catch (e) {
        console.error("Error in bus routing", e);
        return null;
      }
    })();

    try {
      const [walkResult, privateResult, busResult] = await Promise.all([walkPromise, privatePromise, busPromise]);

      // DEBUG LOGGING
      console.log("Walk Result:", walkResult);
      console.log("Bus Result:", busResult);

      // CRITICAL: Check for total failure and report WHY
      if (!walkResult && !busResult) {
        if (targetSchool.properties.routeIds?.length === 0) {
          toast.error("Sekolah ini tidak dilewati jalur Bus Sekolah. Dan rute jalan kaki gagal (terlalu jauh/error).");
        } else if (!apiNearestTerminal) {
          // We tried bus but failed finding terminal
          toast.error("Gagal menemukan Halte Bus terdekat (dalam 3km) yang mengarah ke sekolah ini.");
        } else {
          // Terminal found, but routing failed? Likely ORS API.
          toast.error("Gagal menghitung jalur. Periksa API Key OpenRouteService atau koneksi.");
        }
        // Don't return immediately, let the logic flow handle empty data gracefully?
        // Actually, if we return, we might leave stale state.
        // We should probably setRouteData(null).
        setRouteData(null);
        setComparisonResults(null);
        return;
      }

      // Construct Result Object
      const results = {
        walk: walkResult,
        private: privateResult,
        bus: busResult
      };

      setComparisonResults(results);

      // Auto-Select Logic
      // Auto-Select Logic
      let bestOption = null;

      // Smart Selection Logic (Logic Terbaik Berdasarkan Waktu & Efisiensi)
      const walkDuration = walkResult ? walkResult.duration_minutes : Infinity;

      // 1. Prioritize Walking for short distances (< 15 mins is healthy & fast)
      if (walkResult && walkDuration <= 15) {
        bestOption = 'walk';
      }
      // 2. If Walk is > 15 mins, ALWAYS prefer Bus School if available (User preference)
      else if (busResult) {
        bestOption = 'bus';
      }
      // 3. Fallback to Walk if no Bus available
      else if (walkResult) {
        bestOption = 'walk';
      }

      const selectedData = results[bestOption];

      if (selectedData) {
        setRouteData(selectedData);
        if (bestOption === 'bus') toast.success("Rute Bus Sekolah Direkomendasikan (Jarak Jauh).");
        else if (bestOption === 'walk') toast.success("Jarak dekat (<15 min)! Disarankan jalan kaki.");
      } else {
        // If nothing found
        if (privateResult) {
          // Technically we found a private route but user said "remove it".
          // We can optionally show it as a last resort or just error.
          // "Hilangkan rute pribadi" -> Do not show.
          toast.error("Tidak ada rute Bus Sekolah atau Jalan Kaki yang tersedia untuk lokasi ini.");
        } else {
          toast.error("Gagal menemukan rute transportasi apapun.");
        }
      }

    } catch (e) {
      console.error("Error aggregating routes", e);
      toast.error("Terjadi kesalahan sistem saat mencari rute.");
    }
  };

  // Auto-Calculate Route when Point and School are set
  useEffect(() => {
    if (startPoint && selectedSchool) {
      const t = setTimeout(() => {
        handleFindRoute(selectedSchool);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [startPoint, selectedSchool]);

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
            nearestTerminal={nearestTerminal}
            toggleLayer={handleToggleLayer}
            layersState={layersState}
            routeData={routeData}
            schools={schools}
            busRoutes={busRoutes}
            onSelectSchool={(school) => {
              handleSelectSchool(school);
              setSelectedSchool(school);
            }}
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

      <Toaster position="top-right" />
    </div>
  );
};

export default App;
