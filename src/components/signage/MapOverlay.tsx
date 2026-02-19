'use client';

import Image from 'next/image';

export default function MapOverlay() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full h-full flex items-center justify-center p-0">
                <Image
                    src="/map/d2-5.png"
                    alt="Campus Map"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            <div className="absolute top-4 right-4 text-white/50 text-sm">
                15초 후 자동으로 닫힙니다...
            </div>
        </div>
    );
}
