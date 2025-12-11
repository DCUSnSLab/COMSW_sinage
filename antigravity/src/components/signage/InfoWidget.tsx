'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Loader2 } from 'lucide-react';

export default function InfoWidget() {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState<any>(null);
    const [submits, setSubmits] = useState(128); // Placeholder count

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Weather Fetching (Open-Meteo)
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Hayang-eup coordinates: 35.9115, 128.8178
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.9115&longitude=128.8178&current=temperature_2m,weather_code&timezone=Asia%2FTokyo');
                const data = await res.json();
                setWeather(data.current);
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };

        fetchWeather();
        const wTimer = setInterval(fetchWeather, 60000 * 30); // Every 30 mins
        return () => clearInterval(wTimer);
    }, []);

    // Placeholder submit count fetcher (Mock)
    useEffect(() => {
        // In future: fetch('/api/submit-count')
    }, []);

    const getWeatherIcon = (code: number) => {
        if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-yellow-400" />;
        if (code === 2 || code === 3) return <Cloud className="w-8 h-8 text-gray-400" />;
        if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
        if (code >= 71 && code <= 77) return <CloudSnow className="w-8 h-8 text-white" />;
        if (code >= 95) return <CloudLightning className="w-8 h-8 text-purple-400" />;
        return <Cloud className="w-8 h-8 text-gray-400" />;
    };

    return (
        <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 to-transparent z-40 text-white flex justify-between items-start">
            {/* Left: Time & Date */}
            <div>
                <div className="text-5xl font-bold tracking-tight">
                    {time.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-lg text-gray-300 mt-1">
                    {time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                </div>
            </div>

            {/* Right: Weather & Stats */}
            <div className="flex gap-8 text-right">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-200">하양읍</span>
                    <div className="flex items-center gap-2">
                        {weather ? getWeatherIcon(weather.weather_code) : <Loader2 className="animate-spin w-6 h-6" />}
                        <span className="text-3xl font-bold">{weather ? `${Math.round(weather.temperature_2m)}°` : '--'}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end border-l border-white/20 pl-6">
                    <span className="text-3xl font-bold text-blue-400">{submits}</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Today<br />Submits</span>
                </div>
            </div>
        </div>
    );
}
