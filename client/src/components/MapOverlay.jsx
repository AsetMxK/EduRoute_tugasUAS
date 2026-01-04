import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Search, MapPin, Bus, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MapOverlay = ({ onSearchRoute, toggleLayer, layersState, routeData, schools = [], onSelectSchool, startPoint, selectedSchool, setSelectedSchool, onReset }) => {
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
                                    <Label htmlFor="zonasi" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-red-100/50 rounded-lg text-red-500"><MapPin className="w-4 h-4" /></div>
                                        Area Zonasi
                                    </Label>
                                    <Switch id="zonasi" checked={layersState.zones} onCheckedChange={() => toggleLayer('zones')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="bus" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-amber-100/50 rounded-lg text-amber-500"><Bus className="w-4 h-4" /></div>
                                        Rute Bus Sekolah
                                    </Label>
                                    <Switch id="bus" checked={layersState.bus} onCheckedChange={() => toggleLayer('bus')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="angkot" className="flex items-center gap-3 cursor-pointer text-slate-700 group-hover:text-emerald-600 transition-colors">
                                        <div className="p-1.5 bg-green-100/50 rounded-lg text-green-600"><Bus className="w-4 h-4" /></div>
                                        Rute Angkot
                                    </Label>
                                    <Switch id="angkot" checked={layersState.angkot} onCheckedChange={() => toggleLayer('angkot')} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 group">
                                    <Label htmlFor="graph" className="flex items-center gap-3 cursor-pointer text-slate-400 text-xs uppercase font-bold tracking-wider group-hover:text-slate-600 transition-colors">
                                        <div className="p-1.5 bg-slate-100 rounded-lg"><Layers className="w-3 h-3" /></div>
                                        Debug Graph
                                    </Label>
                                    <Switch id="graph" checked={layersState.graph} onCheckedChange={() => toggleLayer('graph')} />
                                </div>
                            </div>

                            {/* New Section: List of Schools */}
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
                <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-white/50 dark:bg-slate-900/80 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow- emerald-900/5">
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
                        <CardContent className="p-5 pt-4 space-y-5">
                            {/* Route Stats (Visible if route exists) */}
                            {routeData && (
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

                            <Tabs defaultValue="route" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-10 mb-4 bg-slate-100/80 p-1 rounded-xl">
                                    <TabsTrigger value="info" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Info</TabsTrigger>
                                    <TabsTrigger value="route" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Rute</TabsTrigger>
                                </TabsList>

                                <TabsContent value="info" className="text-sm text-slate-600 min-h-[100px] flex flex-col items-center justify-center text-center px-4 space-y-2 animate-in fade-in zoom-in-95">
                                    <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                                    <p>Klik marker sekolah di peta untuk melihat detail zonasi dan info lainnya.</p>
                                </TabsContent>

                                <TabsContent value="route" className="space-y-3 animate-in fade-in zoom-in-95">
                                    <div className="relative pl-6 space-y-4">
                                        {/* Line Connector */}
                                        <div className="absolute left-[11px] top-3 bottom-8 w-0.5 bg-slate-200 -z-10" />

                                        {/* FROM Input */}
                                        <div className="relative group">
                                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[3px] border-blue-500 bg-white shadow-sm ring-4 ring-blue-500/10 transition-all group-hover:scale-110 group-hover:border-blue-600"></div>
                                            <div className="p-3 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-100/80 hover:border-blue-200/50 flex flex-col justify-center transition-all duration-300 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(59,130,246,0.1)]">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lokasi Awal</p>
                                                <p className="text-sm font-semibold text-slate-700 truncate">
                                                    {startPoint ? (
                                                        startPoint.nodeId
                                                            ? `Node #${startPoint.nodeId} (Dekat Jalan Raya)`
                                                            : `📍 Koordinat: ${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`
                                                    ) : <span className="text-slate-400 italic font-normal">Klik peta untuk set lokasi...</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* TO Input */}
                                        <div className="relative group">
                                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[3px] border-emerald-500 bg-white shadow-sm ring-4 ring-emerald-500/10 transition-all group-hover:scale-110 group-hover:border-emerald-600"></div>
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
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                                            onClick={onReset}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white font-bold tracking-wide transition-all active:scale-95"
                                            onClick={onSearchRoute}
                                        >
                                            Mulai Navigasi
                                        </Button>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default MapOverlay;
