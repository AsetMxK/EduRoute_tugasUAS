import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Search, MapPin, Bus, Layers, ChevronDown, ChevronUp, CircleDot, Car, Bike, Footprints, Clock, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MapOverlay = ({ onSearchRoute, toggleLayer, layersState, routeData, schools = [], busRoutes = [], onSelectSchool, startPoint, selectedSchool, setSelectedSchool, onReset, routePreference, setRoutePreference, comparisonResults, onSelectResult, busTransportMode, onChangeBusMode, nearestTerminal }) => {
    const containerRef = useRef();
    const [isExpanded, setIsExpanded] = useState(true);

    // GSAP Animation: Intro UI elements
    useGSAP(() => {
        gsap.from(".floating-search", {
            y: -100,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            delay: 0.5
        });

        gsap.from(".floating-controls", {
            y: 100,
            opacity: 0,
            duration: 1,
            ease: "back.out(1.7)",
            delay: 0.8
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[10] flex flex-col justify-between p-4 md:p-6">

            {/* --- TOP BAR: Search & Sidebar Trigger --- */}
            <div className="floating-search flex gap-3 pointer-events-auto w-full max-w-md mx-auto md:mx-0">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-md border-white/40 shadow-lg hover:bg-white transition-all duration-300 h-11 w-11 shrink-0 rounded-xl">
                            <Layers className="h-5 w-5 text-slate-700" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px] z-[100] bg-white/95 backdrop-blur-xl border-r-0">
                        <SheetHeader>
                            <SheetTitle className="text-emerald-700 font-bold text-2xl tracking-tight">EduRoute Menu</SheetTitle>
                            <SheetDescription>
                                Atur tampilan peta dan filter informasi yang ingin ditampilkan.
                            </SheetDescription>
                        </SheetHeader>

                        {/* Menu Content */}
                        <div className="mt-8 space-y-8">
                            <div className="space-y-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layer Peta</h4>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="schoolAreas" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-emerald-100/50 rounded-lg text-emerald-600"><MapPin className="w-4 h-4" /></div>
                                        Area Sekolah
                                    </Label>
                                    <Switch id="schoolAreas" checked={layersState.schoolAreas} onCheckedChange={() => toggleLayer('schoolAreas')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="busRoutes" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-amber-100/50 rounded-lg text-amber-500"><Bus className="w-4 h-4" /></div>
                                        Rute Bus
                                    </Label>
                                    <Switch id="busRoutes" checked={layersState.busRoutes} onCheckedChange={() => toggleLayer('busRoutes')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="busStops" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-blue-100/50 rounded-lg text-blue-500"><CircleDot className="w-4 h-4" /></div>
                                        Halte Bus
                                    </Label>
                                    <Switch id="busStops" checked={layersState.busStops} onCheckedChange={() => toggleLayer('busStops')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="roads" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><Layers className="w-4 h-4" /></div>
                                        Jalan Raya
                                    </Label>
                                    <Switch id="roads" checked={layersState.roads} onCheckedChange={() => toggleLayer('roads')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="routingPoints" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-red-100/50 rounded-lg text-red-600"><CircleDot className="w-4 h-4" /></div>
                                        Titik Navigasi
                                    </Label>
                                    <Switch id="routingPoints" checked={layersState.routingPoints} onCheckedChange={() => toggleLayer('routingPoints')} className="data-[state=checked]:bg-emerald-500" />
                                </div>
                            </div>

                            {/* ... schools list ... */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Sekolah ({schools.length})</h4>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {schools.length === 0 ? (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        schools.map((school, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-xl cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
                                                onClick={() => onSelectSchool && onSelectSchool(school)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <span className="text-emerald-600 font-bold text-xs">{idx + 1}</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{school.properties.name}</h5>
                                                        <p className="text-[10px] text-slate-500 line-clamp-1">{school.properties.address}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Search Bar */}
                <div className="flex-1 bg-white/80 backdrop-blur-md shadow-lg rounded-xl px-4 h-11 flex items-center gap-3 text-slate-500 cursor-pointer hover:bg-white hover:shadow-xl transition-all duration-300 border border-white/40 group">
                    <Search className="w-4 h-4 shrink-0 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-sm truncate group-hover:text-slate-700 transition-colors">Cari Sekolah / Alamat...</span>
                </div>
            </div>

            {/* --- BOTTOM RIGHT: Route Finder / Action Panel --- */}
            <div className="floating-controls pointer-events-auto self-end md:w-[400px] w-full mt-auto">
                <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-white/50 dark:bg-slate-900/80 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-emerald-900/5">
                    <CardHeader className="py-4 px-5 flex flex-row items-center justify-between space-y-0 cursor-pointer hover:bg-white/50 transition-colors border-b border-slate-100/50" onClick={() => setIsExpanded(!isExpanded)}>
                        <CardTitle className="text-base text-slate-800 font-bold flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Navigasi Sekolah
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100/80 rounded-full transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                        </Button>
                    </CardHeader>

                    {isExpanded && (
                        <CardContent className="p-5 pt-4 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {/* Result Cards Logic */}
                            {routeData && comparisonResults && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pilih Rute Perjalanan</div>

                                    {/* 1. Walk Card */}
                                    <div
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${routeData === comparisonResults.walk
                                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'}`}
                                        onClick={() => comparisonResults.walk && onSelectResult(comparisonResults.walk)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><Footprints className="w-5 h-5" /></div>
                                                <span className="font-bold text-slate-700 text-sm">Jalan Kaki</span>
                                            </div>
                                            {comparisonResults.walk ? (
                                                <div className="text-right">
                                                    <div className="font-black text-lg text-emerald-700">{Math.ceil(comparisonResults.walk.duration_minutes)} <span className="text-xs font-medium text-emerald-600/70">min</span></div>
                                                </div>
                                            ) : <span className="text-xs text-slate-400 italic">Terlalu Jauh</span>}
                                        </div>
                                        {comparisonResults.walk && (
                                            <div className="text-xs text-slate-500 flex gap-3">
                                                <span>{(comparisonResults.walk.distance_meters / 1000).toFixed(2)} km</span>
                                                {comparisonResults.walk.distance_meters < 100 && <span className="text-emerald-600 font-bold">Recommended</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Private Vehicle Card */}
                                    <div
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${routeData === comparisonResults.private
                                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'}`}
                                        onClick={() => comparisonResults.private && onSelectResult(comparisonResults.private)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Car className="w-5 h-5" /></div>
                                                <span className="font-bold text-slate-700 text-sm">Kendaraan Pribadi</span>
                                            </div>
                                            {comparisonResults.private ? (
                                                <div className="text-right">
                                                    <div className="font-black text-lg text-emerald-700">{Math.ceil(comparisonResults.private.duration_minutes)} <span className="text-xs font-medium text-emerald-600/70">min</span></div>
                                                </div>
                                            ) : <span className="text-xs text-slate-400 italic">Tidak Tersedia</span>}
                                        </div>
                                        {comparisonResults.private && (
                                            <div className="text-xs text-slate-500">
                                                {(comparisonResults.private.distance_meters / 1000).toFixed(2)} km
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Bus Card */}
                                    <div
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${routeData === comparisonResults.bus
                                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'}`}
                                        onClick={() => comparisonResults.bus && onSelectResult(comparisonResults.bus)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Bus className="w-5 h-5" /></div>
                                                <span className="font-bold text-slate-700 text-sm">Bus Sekolah</span>
                                            </div>
                                            {comparisonResults.bus ? (
                                                <div className="text-right">
                                                    <div className="font-black text-lg text-emerald-700">{Math.ceil(comparisonResults.bus.duration_minutes)} <span className="text-xs font-medium text-emerald-600/70">min</span></div>
                                                </div>
                                            ) : <span className="text-xs text-red-400 italic font-semibold">Tidak Tersedia</span>}
                                        </div>
                                        {comparisonResults.bus ? (
                                            <>
                                                <div className="text-xs text-slate-500 mb-2">
                                                    Ke Halte: <span className="font-semibold text-slate-700">{comparisonResults.bus.stopName}</span>
                                                    <br />
                                                    Naik Rute: <span className="font-semibold text-blue-600">{comparisonResults.bus.routeName}</span>
                                                </div>

                                                {/* Transport Mode Options to Bus Stop */}
                                                {comparisonResults.bus.modeOptions && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Ke Halte dengan:</div>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {/* Walking */}
                                                            <div
                                                                className={`rounded p-1.5 text-center border cursor-pointer transition-all ${busTransportMode === 'walk'
                                                                    ? 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-500'
                                                                    : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                                                    }`}
                                                                onClick={() => onChangeBusMode('walk')}
                                                            >
                                                                <div className="flex justify-center mb-1"><Footprints className="w-4 h-4 text-emerald-600" /></div>
                                                                <div className="text-[10px] font-semibold text-slate-600">Jalan</div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {Math.ceil(comparisonResults.bus.modeOptions.walk.duration)} min
                                                                    <br />
                                                                    {(comparisonResults.bus.modeOptions.walk.distance / 1000).toFixed(1)} km
                                                                </div>
                                                            </div>

                                                            {/* Car */}
                                                            <div
                                                                className={`rounded p-1.5 text-center border cursor-pointer transition-all ${busTransportMode === 'car'
                                                                    ? 'bg-blue-100 border-blue-500 ring-1 ring-blue-500'
                                                                    : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                                                                    }`}
                                                                onClick={() => onChangeBusMode('car')}
                                                            >
                                                                <div className="flex justify-center mb-1"><Car className="w-4 h-4 text-blue-600" /></div>
                                                                <div className="text-[10px] font-semibold text-slate-600">Mobil</div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {Math.ceil(comparisonResults.bus.modeOptions.car.duration)} min
                                                                    <br />
                                                                    {(comparisonResults.bus.modeOptions.car.distance / 1000).toFixed(1)} km
                                                                </div>
                                                            </div>

                                                            {/* Motorcycle */}
                                                            <div
                                                                className={`rounded p-1.5 text-center border cursor-pointer transition-all ${busTransportMode === 'motor'
                                                                    ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500'
                                                                    : 'bg-slate-50 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                                                                    }`}
                                                                onClick={() => onChangeBusMode('motor')}
                                                            >
                                                                <div className="flex justify-center mb-1"><Bike className="w-4 h-4 text-purple-600" /></div>
                                                                <div className="text-[10px] font-semibold text-slate-600">Motor</div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {Math.ceil(comparisonResults.bus.modeOptions.motor.duration)} min
                                                                    <br />
                                                                    {(comparisonResults.bus.modeOptions.motor.distance / 1000).toFixed(1)} km
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : <div className="text-[10px] text-slate-400">Tidak ada rute bus</div>}
                                    </div>

                                </div>
                            )}

                            {/* Legacy Route Stats */}
                            {routeData && !comparisonResults && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                        <div className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider mb-1">Jarak</div>
                                        <div className="font-black text-2xl text-emerald-700 tracking-tight">{(routeData.distance_meters / 1000).toFixed(1)} <span className="text-sm font-medium opacity-70">km</span></div>
                                    </div>
                                    <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                        <div className="text-[10px] text-blue-600/70 font-bold uppercase tracking-wider mb-1">Estimasi</div>
                                        <div className="font-black text-2xl text-blue-700 tracking-tight">
                                            {routeData.duration_minutes ? Math.ceil(routeData.duration_minutes) : Math.ceil((routeData.distance_meters / 1000) / 30 * 60)} <span className="text-sm font-medium opacity-70">min</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Warning for Last Mile */}
                            {routeData && routeData.requiresWalking && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2 items-start animate-in fade-in zoom-in-95">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <div>
                                        <strong>Akses Terbatas:</strong> Kendaraan mungkin tidak dapat mencapai titik tepat. Silakan lanjutkan dengan berjalan kaki.
                                    </div>
                                </div>
                            )}

                            <Tabs defaultValue="route" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 h-10 mb-0 bg-slate-100/80 p-1 rounded-xl">
                                    <TabsTrigger value="info" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Info</TabsTrigger>
                                    <TabsTrigger value="bus" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">Bus</TabsTrigger>
                                    <TabsTrigger value="route" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Rute</TabsTrigger>
                                </TabsList>

                                <TabsContent value="info" className="mt-0 animate-in fade-in zoom-in-95">
                                    <div className="text-sm text-slate-600 min-h-[100px] flex flex-col items-center justify-center text-center px-4 space-y-2">
                                        <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                                        <p>Klik marker sekolah di peta untuk melihat detail zonasi dan info lainnya.</p>
                                    </div>
                                </TabsContent>

                                {/* Bus Routes Tab */}
                                <TabsContent value="bus" className="mt-0 animate-in fade-in zoom-in-95">
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daftar Rute Bus ({busRoutes.length})</div>

                                        {busRoutes.length === 0 ? (
                                            <div className="text-sm text-slate-500 text-center py-6">
                                                <Bus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                <p>Tidak ada data rute bus.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                                {busRoutes.map((route, idx) => {
                                                    // Find schools connected to this route
                                                    const connectedSchools = schools.filter(school =>
                                                        school.properties.routeIds?.includes(route.properties.id)
                                                    );

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="p-3 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-xl transition-all duration-200 group shadow-sm hover:shadow-md"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {/* Color indicator */}
                                                                <div
                                                                    className="w-4 h-4 rounded-full shrink-0 mt-0.5 ring-2 ring-white shadow-sm"
                                                                    style={{ backgroundColor: route.properties.color || '#888' }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <h5 className="text-sm font-bold text-slate-700 group-hover:text-amber-700 transition-colors truncate">
                                                                        {route.properties.name}
                                                                    </h5>
                                                                    {route.properties.description && (
                                                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                                                            {route.properties.description}
                                                                        </p>
                                                                    )}

                                                                    {/* Connected Schools */}
                                                                    {connectedSchools.length > 0 && (
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            {connectedSchools.map((school, sIdx) => (
                                                                                <span
                                                                                    key={sIdx}
                                                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-medium rounded-md border border-emerald-100"
                                                                                >
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                                    {school.properties.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Schedule info if available */}
                                                                    {route.properties.schedule && (
                                                                        <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-2">
                                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                                            <span>{route.properties.schedule.departure || 'N/A'}</span>
                                                                            <span className="text-[9px]">s/d</span>
                                                                            <span>{route.properties.schedule.return || 'N/A'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="route" className="mt-0 animate-in fade-in zoom-in-95">
                                    <div className="relative pl-6 flex flex-col gap-4">

                                        {/* FROM Input */}
                                        <div className="relative group">
                                            <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[3px] border-blue-500 bg-white shadow-sm ring-4 ring-blue-500/10 transition-all group-hover:scale-110 group-hover:border-blue-600"></div>
                                            <div className="p-3 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-100/80 hover:border-blue-200/50 flex flex-col justify-center transition-all duration-300 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(59,130,246,0.1)]">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lokasi Awal</p>
                                                <p className="text-sm font-semibold text-slate-700 truncate">
                                                    {startPoint ? (
                                                        startPoint.nodeId
                                                            ? `Node #${startPoint.nodeId} (Dekat Jalan Raya)`
                                                            : `Koordinat: ${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`
                                                    ) : <span className="text-slate-400 italic font-normal">Klik peta untuk set pointer lokasi...</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Target School Select */}
                                        <div className="relative group">
                                            <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[3px] border-emerald-500 bg-white shadow-sm ring-4 ring-emerald-500/10 transition-all group-hover:scale-110 group-hover:border-emerald-600"></div>
                                            <div className="p-3 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-100/80 hover:border-emerald-200/50 flex flex-col justify-center transition-all duration-300 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(16,185,129,0.1)]">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tujuan Sekolah</p>
                                                <select
                                                    className="w-full text-sm font-bold text-emerald-800/90 bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-ellipsis appearance-none outline-none placeholder:text-slate-400"
                                                    value={selectedSchool ? selectedSchool.properties.name : ""}
                                                    onChange={(e) => {
                                                        const school = schools.find(s => s.properties.name === e.target.value);
                                                        if (school && setSelectedSchool) {
                                                            setSelectedSchool(school);
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled className="text-slate-400">Pilih Sekolah...</option>
                                                    {schools.map((s, idx) => (
                                                        <option key={idx} value={s.properties.name}>
                                                            {s.properties.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Nearest Terminal Info - NEW */}
                                        {nearestTerminal && (
                                            <div className="relative group animate-in fade-in zoom-in-95">
                                                <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[3px] border-amber-500 bg-white shadow-sm ring-4 ring-amber-500/10"></div>
                                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col justify-center">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Bus className="w-3 h-3 text-amber-600" />
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Halte Terdekat</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800">{nearestTerminal.name}</p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs text-slate-500">{nearestTerminal.distance_meters}m dari lokasi Anda</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Line Connector */}
                                        <div className="absolute left-[11px] top-3 bottom-14 w-0.5 bg-slate-200 -z-10" />

                                    </div>

                                    {routeData ? (
                                        <div className="pt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100 shadow-sm text-center relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-16 h-16 text-emerald-600" /></div>
                                                <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-widest mb-1">Estimasi Perjalanan</p>
                                                <div className="flex justify-center items-baseline gap-1.5 z-10 relative">
                                                    <span className="text-4xl font-black text-emerald-600 tracking-tighter">{Math.ceil(routeData.duration_minutes)}</span>
                                                    <span className="text-sm font-bold text-emerald-600/70">menit</span>
                                                </div>
                                                <div className="text-xs font-semibold text-slate-500 mt-1 z-10 relative">
                                                    Jarak Tempuh: <span className="text-slate-700">{(routeData.distance_meters / 1000).toFixed(1)} km</span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onReset}
                                                className="w-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors h-8 text-xs"
                                            >
                                                Mulai Ulang / Reset
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="pt-6 pb-2 text-center space-y-2 opacity-60">
                                            <div className="w-1 mx-auto h-8 bg-gradient-to-b from-slate-200 to-transparent rounded-full"></div>
                                            <p className="text-xs text-slate-400 font-medium px-4">
                                                Sistem akan otomatis menghitung rute tercepat setelah Anda menentukan lokasi dan sekolah.
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div >
    );
};

export default MapOverlay;
