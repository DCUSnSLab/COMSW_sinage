import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // We need to create these UI components or use simple divs for now
import { Monitor, FileVideo, PlayCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    // We will need to implement db fetch logic.
    // For now, placeholder or basic counts.
    const deviceCount = await prisma.device.count();
    const contentCount = await prisma.content.count();
    const activeDeviceCount = await prisma.device.count({ where: { isActive: true } });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Devices</p>
                            <h3 className="text-3xl font-bold mt-2">{deviceCount}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Monitor className="h-6 w-6" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                        <span className="text-green-600 font-medium">{activeDeviceCount}</span> active now
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Contents</p>
                            <h3 className="text-3xl font-bold mt-2">{contentCount}</h3>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <FileVideo className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">System Status</p>
                            <h3 className="text-3xl font-bold mt-2 text-green-500">Healthy</h3>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <PlayCircle className="h-6 w-6" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
