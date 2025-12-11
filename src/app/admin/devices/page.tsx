import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { DeviceList } from '@/components/admin/DeviceList';

export default async function DevicesPage() {
    const devices = await prisma.device.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            playlists: {
                where: { isActive: true },
                select: { playlistId: true }
            }
        }
    });

    const playlists = await prisma.playlist.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Device Management</h1>
            </div>

            <DeviceList initialDevices={devices} playlists={playlists} />
        </div>
    );
}
