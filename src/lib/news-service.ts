import { prisma } from './db';
import { fetchDepartmentNews, fetchNewsDetail } from './news-scraper';

export async function crawlAndSaveDepartmentNews() {
    console.log('Starting Department News Crawl...');
    try {
        const newsItems = await fetchDepartmentNews(1);
        let newCount = 0;

        for (const item of newsItems) {
            // Check if exists by Link
            const existing = await prisma.departmentNews.findUnique({
                where: { link: item.link }
            });

            if (!existing) {
                // Fetch full details
                console.log(`Fetching details for: ${item.title}`);
                const detail = await fetchNewsDetail(item.link);

                // Use date from detail if available (List page often lacks date)
                const finalDate = detail.date || item.date || new Date().toISOString().split('T')[0];

                await prisma.departmentNews.create({
                    data: {
                        title: detail.title || item.title, // Use full title from detail if available
                        date: finalDate, // Use the fetched date
                        link: item.link,
                        thumbnail: item.thumbnail || null,
                        content: detail.content,
                        images: detail.images,
                        crawledAt: new Date(),
                    }
                });
                newCount++;
            }
        }
        console.log(`Department News Crawl Finished. New items: ${newCount}`);
        return { success: true, count: newCount };
    } catch (error) {
        console.error('Department News Crawl Failed:', error);
        return { success: false, error };
    }
}
