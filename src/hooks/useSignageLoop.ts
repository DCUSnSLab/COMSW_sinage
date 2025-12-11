import { useState, useEffect, useRef } from 'react';

// Define a simplified Content type for the player
export interface SignageContent {
    id: string;
    title: string;
    type: string;
    url: string | null;
    body: string | null;
    duration: number;
    zone?: string;
}

export function useSignageLoop(initialContents: SignageContent[]) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const contentsRef = useRef(initialContents);

    // Keep ref synced
    useEffect(() => {
        contentsRef.current = initialContents;
    }, [initialContents]);

    useEffect(() => {
        // Reset index if contents change drastically (optional safety)
        if (currentIndex >= initialContents.length) {
            setCurrentIndex(0);
        }
    }, [initialContents.length]);

    const activeContent = initialContents[currentIndex];

    useEffect(() => {
        if (!activeContent) return;

        const playNext = () => {
            setCurrentIndex((prev) => (prev + 1) % contentsRef.current.length);
        };

        const duration = (activeContent.duration || 10) * 1000;

        // Clear previous timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Set new timer
        timerRef.current = setTimeout(playNext, duration);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [activeContent]); // Only reset if the ITEM changes, not the array

    return activeContent || null;
}
