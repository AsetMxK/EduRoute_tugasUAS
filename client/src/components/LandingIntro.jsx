import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Bus, School, Navigation, Globe } from "lucide-react";

const LandingIntro = ({ onStart }) => {
    const comp = useRef();
    const cardRef = useRef();

    useGSAP(() => {
        const tl = gsap.timeline();

        // 1. Initial Blob Animation (Ambient)
        gsap.to(".blob", {
            x: "random(-40, 40)",
            y: "random(-40, 40)",
            scale: "random(0.9, 1.1)",
            rotation: "random(-20, 20)",
            duration: "random(8, 12)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: 2
        });

        // 2. Entrance Sequence
        tl.from(".glass-card", {
            scale: 0.8,
            opacity: 0,
            y: 50,
            duration: 1.2,
            ease: "power4.out"
        })
            .from(".icon-float", {
                y: 40,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "back.out(2)"
            }, "-=0.8")
            .from(".hero-text", {
                y: 20,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=0.6")
            .from(".start-btn-container", {
                scale: 0,
                opacity: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.6)"
            }, "-=0.4");

        // 3. Continuous Floating for Icons (Vertical bobbing)
        gsap.to(".icon-float", {
            y: "-=15",
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: {
                each: 0.5,
                from: "random"
            }
        });

        // 4. Mouse Parallax Effect
        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const xPos = (clientX / window.innerWidth - 0.5);
            const yPos = (clientY / window.height - 0.5);

            // Move card slightly opposite to mouse
            gsap.to(".glass-card", {
                rotationY: xPos * 5, // 3D tilt
                rotationX: -yPos * 5,
                x: -xPos * 20,
                y: -yPos * 20,
                duration: 1,
                ease: "power2.out"
            });

            // Move blobs (background) deeply
            gsap.to(".blob", {
                x: xPos * 50,
                y: yPos * 50,
                duration: 2,
                ease: "power2.out",
                overwrite: "auto" // Allow overriding the ambient animation slightly
            });

            // Move floating icons (foreground) more to create depth
            gsap.to(".icon-1", { x: xPos * 40, y: yPos * 40, duration: 1 });
            gsap.to(".icon-2", { x: xPos * -30, y: yPos * -30, duration: 1 });
            gsap.to(".icon-3", { x: xPos * 50, y: yPos * 30, duration: 1 });
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };

    }, { scope: comp });

    return (
        <div ref={comp} className="fixed inset-0 overflow-hidden z-[5000] flex items-center justify-center font-sans bg-slate-50 perspective-[1000px]">
            {/* Animated Background Layers */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-sky-50 to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent"></div>

            {/* Animated Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="blob absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-[100px] mix-blend-multiply opacity-70"></div>
                <div className="blob absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-emerald-300/30 rounded-full blur-[100px] mix-blend-multiply opacity-70 animation-delay-2000"></div>
                <div className="blob absolute bottom-[10%] left-[20%] w-[600px] h-[600px] bg-sky-300/30 rounded-full blur-[100px] mix-blend-multiply opacity-70 animation-delay-4000"></div>
                <div className="blob absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-amber-200/30 rounded-full blur-[80px] mix-blend-multiply opacity-70"></div>
            </div>

            {/* Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay pointer-events-none"></div>

            {/* Main Center Card */}
            <div ref={cardRef} className="glass-card relative z-10 w-full max-w-4xl mx-4 p-8 md:p-16 flex flex-col items-center text-center transform-style-3d">
                {/* Clean Glass Layer */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/80"></div>

                {/* Content Container */}
                <div className="relative z-20 flex flex-col items-center">

                    {/* Floating Icons 3D */}
                    <div className="icon-float icon-1 absolute -top-20 -left-12 md:-top-24 md:-left-24 bg-white/80 backdrop-blur p-5 rounded-3xl shadow-2xl shadow-emerald-500/10 border border-white rotate-[-8deg] hover:rotate-[-12deg] transition-transform duration-500">
                        <div className="p-3 bg-emerald-100/50 rounded-2xl">
                            <School className="w-10 h-10 md:w-12 md:h-12 text-emerald-600" />
                        </div>
                    </div>

                    <div className="icon-float icon-2 absolute top-1/3 -right-16 md:-right-32 bg-white/80 backdrop-blur p-4 rounded-full shadow-2xl shadow-blue-500/10 border border-white animate-pulse-slow">
                        <div className="p-3 bg-blue-100/50 rounded-full">
                            <Bus className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                        </div>
                    </div>

                    <div className="icon-float icon-3 absolute -bottom-16 left-8 md:-bottom-20 md:left-16 bg-white/80 backdrop-blur p-5 rounded-3xl shadow-2xl shadow-amber-500/10 border border-white rotate-[6deg] hover:rotate-[10deg] transition-transform duration-500">
                        <div className="p-3 bg-amber-100/50 rounded-2xl">
                            <MapPin className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
                        </div>
                    </div>

                    {/* Top Badge */}
                    <div className="hero-text mb-8 inline-flex items-center gap-3 px-5 py-2 bg-white/50 border border-white rounded-full shadow-sm backdrop-blur-md hover:bg-white/80 transition-colors cursor-default">
                        <Globe className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                        <span className="text-[11px] md:text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">Sistem Zonasi & Transportasi</span>
                    </div>

                    {/* Main Title with Gradient Text */}
                    <h1 className="hero-text text-7xl md:text-9xl font-black tracking-tighter text-slate-900 mb-2 relative">
                        <span className="relative z-10">Edu</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 animate-gradient-x relative z-10">
                            Route
                        </span>
                        {/* Shadow text for depth */}
                        <span className="absolute top-1 left-1 text-slate-900/5 -z-10 blur-[2px]">EduRoute</span>
                    </h1>

                    <div className="hero-text flex items-center justify-center gap-6 mb-10 opacity-60">
                        <span className="h-px w-20 bg-gradient-to-r from-transparent to-slate-400"></span>
                        <span className="text-xl md:text-2xl font-bold text-slate-800 tracking-[0.3em] uppercase">Bontang</span>
                        <span className="h-px w-20 bg-gradient-to-l from-transparent to-slate-400"></span>
                    </div>

                    {/* Description */}
                    <p className="hero-text text-slate-600 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mb-12 text-center">
                        Platform cerdas untuk menemukan <span className="font-semibold text-emerald-700">sekolah ideal</span> dan <span className="font-semibold text-blue-700">rute perjalanan</span> terbaik bagi masa depan pendidikan putra-putri Anda.
                    </p>

                    {/* CTA Button - Premium 3D Style */}
                    <div className="start-btn-container relative group">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 group-hover:blur-xl transition duration-500"></div>

                        <Button
                            size="lg"
                            className="relative h-20 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-2xl flex items-center gap-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            onClick={onStart}
                        >
                            <div className="relative z-10 flex flex-col items-start">
                                <span className="text-2xl font-bold tracking-wide">Mulai Navigasi</span>
                                <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Buka Peta Interaktif</span>
                            </div>

                            <div className="relative z-10 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </div>

                            {/* Shine Effect */}
                            <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-shine" />
                        </Button>
                    </div>

                </div>
            </div>

            {/* Bottom Footer */}
            <div className="absolute bottom-8 flex flex-col items-center gap-2 text-slate-400/60 transition-opacity hover:opacity-100">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase">
                    <Navigation className="w-3 h-3" />
                    Pemerintah Kota Bontang
                </div>
                <div className="text-[9px]">© 2025 Dinas Pendidikan & Kebudayaan</div>
            </div>
        </div>
    );
};

export default LandingIntro;
