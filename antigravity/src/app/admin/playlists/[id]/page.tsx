import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { PlaylistDetail } from '@/components/admin/PlaylistDetail';
import { notFound } from 'next/navigation';

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({
        where: { id },
        include: {
            contents: {
                include: { content: true },
                orderBy: { displayOrder: 'asc' }
            }
        }
    });

    if (!playlist) notFound();

    const allContents = await prisma.content.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{playlist.name}</h1>
                    <p className="text-gray-500">{playlist.description}</p>
                </div>
            </div>

            <PlaylistDetail playlist={playlist} allContents={allContents} />
        </div>
    );
}
