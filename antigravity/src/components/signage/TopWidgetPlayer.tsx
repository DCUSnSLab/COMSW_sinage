'use client';

import { useState, useEffect } from 'react';
import WeeklyScheduleWidget from './widgets/WeeklyScheduleWidget';

export default function TopWidgetPlayer() {
    // In the future, this list can be dynamic or fetched
    const widgets = ['SCHEDULE'];
    const [activeWidget, setActiveWidget] = useState('SCHEDULE');

    // Rotation logic (Placeholder for when more widgets exist)
    useEffect(() => {
        if (widgets.length <= 1) return;
        const interval = setInterval(() => {
            // Rotate logic
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full relative overflow-hidden bg-gray-900 border-b border-gray-800 shadow-2xl z-50">
            {activeWidget === 'SCHEDULE' && <WeeklyScheduleWidget />}
        </div>
    );
}
