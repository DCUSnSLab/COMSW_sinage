
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { prisma } = await import('@/lib/db');
        const { crawlYouTubeChannel, downloadAndSaveVideo } = await import('@/lib/crawl-service');

        console.log('Initializing Auto-Crawl Scheduler...');

        // Run every minute to check if any task is due
        setInterval(async () => {
            // console.log('Checking for scheduled crawls...'); // Noise reduction
            try {
                // Fetch all active settings
                const allSettings = await prisma.crawlSettings.findMany({
                    where: { isActive: true }
                });

                for (const settings of allSettings) {
                    if (!settings.channelUrl) continue;

                    const now = new Date();
                    const lastChecked = settings.lastCheckedAt ? new Date(settings.lastCheckedAt) : new Date(0);
                    const nextCheck = new Date(lastChecked.getTime() + settings.checkInterval * 60000);

                    if (now >= nextCheck) {
                        console.log(`Auto-Crawling started for: ${settings.name || settings.channelUrl}`);

                        // Update timestamp first to prevent double-execution
                        await prisma.crawlSettings.update({
                            where: { id: settings.id },
                            data: { lastCheckedAt: now }
                        });

                        // 1. Crawl
                        try {
                            const videos = await crawlYouTubeChannel(settings.channelUrl);
                            console.log(`[${settings.name}] Found ${videos.length} potential videos`);

                            // 2. Download valid ones
                            for (const video of videos) {
                                // De-dupe by Title
                                const exists = await prisma.content.findFirst({
                                    where: {
                                        title: video.title,
                                        type: 'VIDEO'
                                    }
                                });

                                if (!exists) {
                                    console.log(`[${settings.name}] New video found: ${video.title}. Downloading...`);
                                    await downloadAndSaveVideo(video.url, video.title, video.title, settings.name || settings.channelUrl);
                                }
                            }
                        } catch (err) {
                            console.error(`[${settings.name}] Auto-Crawl Logic Error:`, err);
                        }
                    }
                }
            } catch (e) {
                console.error('Scheduler Error:', e);
            }
        }, 60 * 1000); // Check every 60 seconds
    }
}
