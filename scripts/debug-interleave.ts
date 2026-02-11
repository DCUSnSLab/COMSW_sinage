
import { prisma } from '../src/lib/db';

async function main() {
    const devices = await prisma.device.findMany({
        where: {
            crawlPlaylistId: { not: null }
        },
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
            },
            crawlPlaylist: {
                include: {
                    contents: {
                        include: { content: true },
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            }
        }
    });

    if (devices.length === 0) {
        console.log("No devices with crawlPlaylistId found.");
        return;
    }

    const device = devices[0];
    console.log(`Checking Device: ${device.name} (${device.id})`);
    console.log(`Crawler Interval: ${device.crawlerInterval}`);
    console.log(`Crawl Playlist: ${device.crawlPlaylist?.name}`);

    // Flatten contents
    const allContents = device.playlists.flatMap(dp =>
        dp.playlist.contents.map(pc => ({
            ...pc.content,
            title: pc.content.title,
            zone: pc.zone,
            displayOrder: pc.displayOrder
        }))
    );

    const now = new Date();
    const validContents = allContents.filter(c => {
        if (!c.isActive) return false;
        // Mock date check or skip if dates are null
        return true;
    });

    console.log(`Valid Main Contents: ${validContents.length}`);

    // Interleaving Logic (Copied from route.ts)
    let finalContents = [...validContents];

    // Cast device to any to access new fields before regeneration
    const d = device as any;

    if (d.crawlPlaylistId && d.crawlPlaylist) {
        // Get crawler contents
        const crawlerContentsRaw = d.crawlPlaylist.contents
            .map((pc: any) => pc.content) // Cast pc to any
            .filter((c: any) => c.isActive);

        console.log(`Crawler Contents Raw: ${crawlerContentsRaw.length}`);

        if (crawlerContentsRaw.length > 0) {
            const interval = d.crawlerInterval || 5;
            const mixed: any[] = [];
            let crawlerIndex = 0;
            let itemsSinceLastCrawl = 0;

            for (const content of validContents) {
                mixed.push(content);

                // Only increment counter for MAIN zone items to ensure correct interval in Main loop
                if (!content.zone || content.zone === 'MAIN') {
                    itemsSinceLastCrawl++;
                }

                if (itemsSinceLastCrawl >= interval) {
                    const crawlerContent = crawlerContentsRaw[crawlerIndex % crawlerContentsRaw.length];
                    mixed.push({ ...crawlerContent, title: `[CRAWLER] ${crawlerContent.title}` }); // Mark for visibility
                    crawlerIndex++;
                    itemsSinceLastCrawl = 0;
                }
            }
            finalContents = mixed;
        }
    }

    console.log("\n--- Final Playlist Order ---");
    finalContents.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title} ${c.zone ? `(${c.zone})` : ''}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
