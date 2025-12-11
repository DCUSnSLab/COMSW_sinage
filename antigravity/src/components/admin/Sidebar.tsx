'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Monitor, Layers, FileText, MessageSquare, Calendar } from 'lucide-react';

const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Devices', href: '/admin/devices', icon: Monitor },
    { name: 'Playlists', href: '/admin/playlists', icon: Layers },
    { name: 'Contents', href: '/admin/contents', icon: FileText },
    { name: 'Notices', href: '/admin/notices', icon: MessageSquare },
    { name: 'Top Contents', href: '/admin/top-contents', icon: Calendar },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-gray-800">
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-2xl font-bold tracking-tight">Antigravity</h1>
                <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <div className="text-xs text-gray-500 text-center">
                    v2.0.0
                </div>
            </div>
        </div>
    );
}
