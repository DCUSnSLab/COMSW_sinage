import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { PlaylistList } from '@/components/admin/PlaylistList';

export default async function PlaylistsPage() {
    const playlists = await prisma.playlist.findMany({
        include: {
            _count: {
                select: { contents: true, devices: true }
            }
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Playlist Management</h1>
            </div>

            <PlaylistList initialPlaylists={playlists} />
        </div>
    );
}
