import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

        // Manually fetch crawlPlaylist if needed
        // This avoids "Unknown argument crawlPlaylist" validation error in cached clients
        let crawlPlaylist = null;
        if (device.crawlPlaylistId) {
            crawlPlaylist = await prisma.playlist.findUnique({
                where: { id: device.crawlPlaylistId },
                include: {
                    contents: {
                        include: { content: true },
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            });
        }

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

        // --- Interleaving Logic ---
        let finalContents = [...validContents];

        // Cast device to any to access new fields (crawlerInterval)
        const d = device as any;

        console.log(`[API Debug] Device: ${d.name}, CrawlPlaylistId: ${d.crawlPlaylistId}`);
        if (crawlPlaylist) {
            console.log(`[API Debug] CrawlPlaylist Contents: ${crawlPlaylist.contents.length}`);
        } else {
            console.log(`[API Debug] CrawlPlaylist is NULL`);
        }

        if (d.crawlPlaylistId && crawlPlaylist) {
            // Get crawler contents
            const crawlerContentsRaw = crawlPlaylist.contents
                .map((pc: any) => pc.content) // Cast pc to any
                .filter((c: any) => c.isActive);

            console.log(`[API Debug] Active Crawler Contents: ${crawlerContentsRaw.length}`);

            if (crawlerContentsRaw.length > 0) {
                const interval = d.crawlerInterval || 5;
                const mixed: any[] = [];
                let crawlerIndex = 0;
                let itemsSinceLastCrawl = 0;

                // Calculate total slots needed to show all crawler items
                // We need to insert crawler items until we wrap around the crawler list at least once
                // OR we just ensure we have enough main items.
                // Strategy: Repeat validContents until we have shown all crawler items.

                let crawlerWrapCount = 0;
                let processedMainCount = 0;

                // Safety break to prevent infinite loops if something is wrong (e.g. interval 0)
                const MAX_LOOPS = 5;
                let loopCount = 0;

                while (true) {
                    loopCount++;

                    for (const content of validContents) {
                        mixed.push(content);

                        // Increment counter (MAIN zone only)
                        if (!content.zone || content.zone === 'MAIN') {
                            itemsSinceLastCrawl++;
                            processedMainCount++;
                        }

                        if (itemsSinceLastCrawl >= interval) {
                            mixed.push(crawlerContentsRaw[crawlerIndex % crawlerContentsRaw.length]);
                            crawlerIndex++;
                            itemsSinceLastCrawl = 0;
                        }
                    }

                    // Look ahead: Have we shown all crawler items?
                    // basic check: if we have inserted enough crawler items to cover the list length
                    if (crawlerIndex >= crawlerContentsRaw.length) {
                        break;
                    }

                    if (loopCount >= MAX_LOOPS) {
                        console.warn('[Signage API] Max loops reached for interleaving.');
                        break;
                    }

                    // If we haven't shown all crawler items, loop the main playlist again
                }

                finalContents = mixed;
            }
        }

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
            contents: finalContents,
            notices: notices.map(n => n.message)
        });

    } catch (error) {
        console.error('Signage API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
