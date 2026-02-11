
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { prisma } = await import('@/lib/db');
        const { crawlYouTubeChannel, downloadAndSaveVideo } = await import('@/lib/crawl-service');
        const { crawlAndSaveDepartmentNews } = await import('@/lib/news-service');

        console.log('Initializing Auto-Crawl Scheduler...');

        // Run every minute to check if any task is due
        setInterval(async () => {
            // console.log('Checking for scheduled crawls...'); // Noise reduction
            try {
                const now = new Date();

                // --- 1. YouTube Crawler ---
                // Fetch YOUTUBE settings
                const youtubeSettings = await prisma.crawlSettings.findMany({
                    where: {
                        isActive: true,
                        type: 'YOUTUBE'
                    }
                });

                for (const settings of youtubeSettings) {
                    if (!settings.channelUrl) continue;

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
                                    await downloadAndSaveVideo(
                                        video.url,
                                        video.title,
                                        video.title, // Body is now just the title
                                        settings.name,
                                        settings.playlistId || undefined
                                    );
                                }
                            }
                        } catch (e) {
                            console.error(`[${settings.name}] Crawl failed:`, e);
                        }
                    }
                }

                // --- 2. Department News Crawler ---
                const newsSettings = await prisma.crawlSettings.findFirst({
                    where: { type: 'DEPARTMENT_NEWS' }
                });

                if (newsSettings && newsSettings.isActive) {
                    const lastChecked = newsSettings.lastCheckedAt ? new Date(newsSettings.lastCheckedAt) : new Date(0);
                    const nextNewsCheck = new Date(lastChecked.getTime() + newsSettings.checkInterval * 60000);

                    if (now >= nextNewsCheck) {
                        console.log('Auto-Crawling Department News...');

                        await prisma.crawlSettings.update({
                            where: { id: newsSettings.id },
                            data: { lastCheckedAt: now }
                        });

                        await crawlAndSaveDepartmentNews();
                    }
                }

            } catch (error) {
                console.error('Scheduler Error:', error);
            }
        }, 60000); // Check every minuteconds
    }
}
