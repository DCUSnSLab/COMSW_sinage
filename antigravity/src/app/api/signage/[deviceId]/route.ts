import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const deviceId = (await params).deviceId;

    try {
        const device = await prisma.device.findUnique({
            where: { id: deviceId },
            include: {
                playlists: {
                    where: { isActive: true },
                    include: {
                        playlist: {
                            include: {
                                contents: {
                                    include: {
                                        content: true
                                    },
                                    orderBy: { displayOrder: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (!device.isActive) {
            return NextResponse.json({ error: 'Device is inactive' }, { status: 403 });
        }

        // Flatten contents
        const allContents = device.playlists.flatMap(dp =>
            dp.playlist.contents.map(pc => ({
                ...pc.content,
                zone: pc.zone,
                displayOrder: pc.displayOrder
            }))
        );

        // Filter by date validity
        const now = new Date();
        const validContents = allContents.filter(c => {
            if (!c.isActive) return false;
            if (c.startDate && new Date(c.startDate) > now) return false;
            if (c.endDate && new Date(c.endDate) < now) return false;
            return true;
        });

        // Fetch active notices
        const notices = await prisma.notice.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            device: {
                name: device.name,
                layoutMode: device.layoutMode,
                splitRatio: device.splitRatio || 50,
            },
            contents: validContents,
            notices: notices.map(n => n.message)
        });

    } catch (error) {
        console.error('Signage API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
