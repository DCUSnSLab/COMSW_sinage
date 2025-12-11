'use client';

import { SignageContent } from '@/hooks/useSignageLoop';
import { cn } from '@/lib/utils';

export default function ContentRenderer({ content }: { content: SignageContent | null }) {
    if (!content) {
        return (
            <div className="w-full h-full bg-black flex items-center justify-center text-white/50">
                <div className="text-center animate-pulse">
                    <h2 className="text-2xl font-bold mb-2 tracking-widest">ANTIGRAVITY</h2>
                    <p className="text-sm uppercase tracking-wide">System Standby</p>
                </div>
            </div>
        );
    }

    const wrapperClass = "w-full h-full flex flex-col bg-black overflow-hidden relative group";

    // Infotainment Text Component (Bottom Area)
    const InfoTextBox = ({ text }: { text: string | null }) => {
        if (!text) return null;
        return (
            <div className="w-full bg-gradient-to-r from-gray-900 to-black border-t border-gray-800/50 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 shrink-0">
                <div className="w-[85%] mx-auto flex gap-4 items-start">
                    <div className="h-12 w-1 bg-blue-500 rounded-full shrink-0 mt-1" />
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight whitespace-pre-wrap">
                            {text}
                        </h2>
                    </div>
                </div>
            </div>
        );
    };

    if (content.type === 'IMAGE' && content.url) {
        return (
            <div className={wrapperClass}>
                <div className="flex-1 relative w-full overflow-hidden bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={content.url}
                        alt={content.title || "Signage Content"}
                        className="w-full h-full object-contain"
                    />
                </div>
                <InfoTextBox text={content.body} />
            </div>
        );
    }

    if (content.type === 'VIDEO' && content.url) {
        return (
            <div className={wrapperClass}>
                <div className="flex-1 relative w-full overflow-hidden bg-black flex items-center justify-center">
                    <video
                        src={content.url}
                        className="w-full h-full object-contain"
                        autoPlay
                        muted
                        loop
                    />
                </div>
                <InfoTextBox text={content.body} />
            </div>
        );
    }

    if (content.type === 'TEXT') {
        return (
            <div className={cn(wrapperClass, "bg-gradient-to-br from-gray-900 to-black")}>
                <div className="max-w-5xl w-full p-12">
                    <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 rounded-full border border-blue-500/30">
                        Notice
                    </span>
                    <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-8 leading-tight">
                        {content.body}
                    </h1>
                    <div className="h-2 w-32 bg-blue-600 rounded-full opacity-80" />
                </div>
            </div>
        );
    }

    return null;
}
