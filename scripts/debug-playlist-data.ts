
import { prisma } from '../src/lib/db';

async function main() {
    // Target device ID from previous logs
    const deviceId = 'cmldw8s110005to9wybzh5x6w';

    console.log(`Checking device: ${deviceId}`);

    const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: {
            playlists: {
                where: { isActive: true },
                include: {
                    playlist: {
                        include: {
                            contents: {
                                include: { content: true },
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

    if (!device) {
        console.error("Device not found!");
        return;
    }

    console.log(`Device Name: ${device.name}`);
    console.log(`Crawler Interval: ${device.crawlerInterval}`);

    // Main Content Analysis
    const allContents = device.playlists.flatMap(dp => dp.playlist.contents);
    const mainZoneContents = allContents.filter(c => !c.zone || c.zone === 'MAIN');

    console.log(`\n--- Main Playlist ---`);
    console.log(`Total Items: ${allContents.length}`);
    console.log(`Main Zone Items: ${mainZoneContents.length}`);
    mainZoneContents.forEach((c, i) => {
        console.log(`#${i + 1}: ${c.content.title} (Zone: ${c.zone})`);
    });

    // Crawler Playlist Analysis
    console.log(`\n--- Crawler Playlist ---`);
    if (device.crawlPlaylist) {
        const crawlerContents = device.crawlPlaylist.contents;
        console.log(`Total Crawler Items: ${crawlerContents.length}`);
        crawlerContents.forEach((c, i) => {
            console.log(`#${i + 1}: ${c.content.title} (Active: ${c.content.isActive})`);
        });

        const activeCrawlerItems = crawlerContents.filter(c => c.content.isActive);
        console.log(`Active Crawler Items: ${activeCrawlerItems.length}`);
    } else {
        console.log("No Crawler Playlist Assigned.");
    }

    // Simulation
    console.log(`\n--- Simulation (Interval: ${device.crawlerInterval}) ---`);
    const interval = device.crawlerInterval || 5;
    const activeCrawlerRaw = device.crawlPlaylist?.contents.map(c => c.content).filter(c => c.isActive) || [];

    if (activeCrawlerRaw.length === 0) {
        console.log("No active crawler items to interleave.");
    } else {
        let crawlerIndex = 0;
        let itemsSinceLastCrawl = 0;

        mainZoneContents.forEach((c, i) => {
            console.log(`[Item] ${c.content.title}`);
            itemsSinceLastCrawl++;

            if (itemsSinceLastCrawl >= interval) {
                const crawlerItem = activeCrawlerRaw[crawlerIndex % activeCrawlerRaw.length];
                console.log(`   >>> INSERT CRAWLER: ${crawlerItem.title} (Index: ${crawlerIndex})`);
                crawlerIndex++;
                itemsSinceLastCrawl = 0;
            }
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
