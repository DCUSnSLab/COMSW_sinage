'use client';

import { useEffect, useState } from 'react';
import { useSignageLoop, SignageContent } from '@/hooks/useSignageLoop';
import ContentRenderer from './ContentRenderer';
import InfoWidget from './InfoWidget';
import TopWidgetPlayer from './TopWidgetPlayer';

interface PlayerProps {
    deviceId: string;
}

interface DeviceData {
    device: {
        name: string;
        layoutMode: string;
        splitRatio?: number;
    };
    contents: SignageContent[];
    notices?: string[];
}

const Marquee = ({ notices }: { notices: string[] }) => {
    if (!notices.length) return null;
    return (
        <div className="bg-black text-white py-2 overflow-hidden whitespace-nowrap border-t border-gray-800 absolute bottom-0 w-full z-50 h-12 flex items-center pointer-events-none">
            <div className="absolute top-0 h-full flex items-center animate-marquee whitespace-nowrap will-change-transform">
                {notices.map((msg, i) => (
                    <span key={i} className="mx-12 text-3xl font-bold tracking-wide">{msg}</span>
                ))}
            </div>
            <style jsx>{`
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(100vw); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};

export default function SignagePlayer({ deviceId }: PlayerProps) {
    const [data, setData] = useState<DeviceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Poll for updates every 5 seconds
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/signage/${deviceId}`);
                if (!res.ok) throw new Error('Failed to fetch config');
                const json = await res.json();

                // Only update if data actually changed to avoid resetting timers in children
                setData(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(json)) return prev;
                    return json;
                });
                setError(null);
            } catch (err) {
                console.error(err);
                setError('Connection Lost - Retrying...');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // 5 seconds polling
        return () => clearInterval(interval);
    }, [deviceId]);

    // Derived state for loop
    const layoutMode = data?.device.layoutMode;
    const splitRatio = data?.device.splitRatio || 50; // Default 50%
    const notices = data?.notices || [];

    // Filter contents
    const allContents = data?.contents || [];
    const mainContents = allContents.filter(c => !c.zone || c.zone === 'MAIN');
    const subContents = allContents.filter(c => c.zone === 'SUB');

    const mainItem = useSignageLoop(mainContents);
    const subItem = useSignageLoop(subContents);

    // Common structure for Main Zone with Top Widget
    const renderMainZone = () => (
        <div className="w-full h-full flex flex-col relative">
            {/* Top Content Widget (15%) */}
            <div className="h-[15%] w-full relative z-30">
                <TopWidgetPlayer />
            </div>
            {/* Main Content (85%) */}
            <div className="h-[85%] w-full relative">
                <ContentRenderer content={mainItem} />
                <div className="absolute top-2 right-2 text-xs text-white/20 z-10">Zone: MAIN</div>
            </div>
        </div>
    );

    if (loading) return <div className="bg-black h-screen w-full flex items-center justify-center text-white">Loading System...</div>;
    if (error) return <div className="bg-black h-screen w-full flex items-center justify-center text-red-500">{error}</div>;

    // Safe split ratio (limit 20-80)
    const ratio = Math.min(Math.max(splitRatio, 20), 80);

    // Adjust height for Marquee if present
    const contentClass = notices.length ? "h-[calc(100vh-3rem)]" : "h-screen";

    if (layoutMode === 'SPLIT') {
        return (
            <div className="relative w-full h-screen bg-black overflow-hidden">
                <div className={`w-full flex flex-col ${contentClass}`}>

                    {/* Top / Sub Zone (Swapped) */}
                    <div className="w-full relative border-b-2 border-gray-800" style={{ height: `${100 - ratio}%` }}>
                        <InfoWidget />
                        <ContentRenderer content={subItem} />
                        <div className="absolute bottom-2 right-2 text-xs text-white/20 z-10">Zone: SUB</div>
                    </div>

                    {/* Bottom / Main Zone (Swapped) */}
                    <div className="w-full relative" style={{ height: `${ratio}%` }}>
                        {renderMainZone()}
                    </div>
                </div>
                <Marquee notices={notices} />
            </div>
        );
    }

    if (layoutMode === 'SPLIT_H') {
        return (
            <div className="relative w-full h-screen bg-black overflow-hidden">
                <div className={`w-full flex flex-row ${contentClass}`}>

                    {/* Left / Sub Zone (Swapped) */}
                    <div className="h-full relative border-r-2 border-gray-800" style={{ width: `${100 - ratio}%` }}>
                        <InfoWidget />
                        <ContentRenderer content={subItem} />
                        <div className="absolute bottom-2 right-2 text-xs text-white/20 z-10">Zone: SUB</div>
                    </div>

                    {/* Right / Main Zone (Swapped) */}
                    <div className="h-full relative" style={{ width: `${ratio}%` }}>
                        {renderMainZone()}
                    </div>
                </div>
                <Marquee notices={notices} />
            </div>
        );
    }

    // Full Screen Mode
    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <div className={`w-full relative ${contentClass}`}>
                <ContentRenderer content={mainItem} />
            </div>
            <Marquee notices={notices} />
        </div>
    );
}
