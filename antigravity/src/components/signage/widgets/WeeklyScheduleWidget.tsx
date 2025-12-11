'use client';

import { useState, useEffect } from 'react';
import { getMonthSchedules } from '@/app/admin/top-contents/actions';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WeeklyScheduleWidget() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            const now = new Date();
            // Fetch for current month (simple approximation for "this week")
            // Ideally should fetch range, but getMonthSchedules exists
            const data = await getMonthSchedules(now.getFullYear(), now.getMonth());

            // Filter for "This Week" (Sun - Sat)
            const today = new Date();
            const day = today.getDay(); // 0 (Sun) - 6 (Sat)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - day);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - day));
            endOfWeek.setHours(23, 59, 59, 999);

            const thisWeek = data.filter((s: any) => {
                const d = new Date(s.date);
                return d >= startOfWeek && d <= endOfWeek;
            });

            setSchedules(thisWeek);
        };
        fetch();
        const interval = setInterval(fetch, 60000); // 1 minute update interval
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (schedules.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % schedules.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [schedules.length]);

    if (schedules.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500 gap-2">
                <Calendar className="w-6 h-6 opacity-50" />
                <span className="text-lg font-medium">No schedules this week</span>
            </div>
        );
    }

    const currentReq = schedules[currentIndex];

    return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-r from-blue-900/20 to-transparent relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-8 flex items-center gap-3 bg-black/30 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_15px_#60A5FA]"></div>
                <span className="text-2xl font-bold text-white tracking-wide drop-shadow-md">이번주 컴소일정</span>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentReq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-6"
                >
                    <div className="flex flex-col items-center bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                        <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">
                            {new Date(currentReq.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-2xl font-bold text-white leading-none mt-1">
                            {new Date(currentReq.date).getDate()}
                        </span>
                    </div>

                    <div className="h-10 w-px bg-white/20" />

                    <div className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                        {currentReq.content}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            {schedules.length > 1 && (
                <div className="absolute bottom-4 flex gap-1.5">
                    {schedules.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-blue-400 w-3' : 'bg-gray-600'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
