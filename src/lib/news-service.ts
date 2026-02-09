import { prisma } from './db';
import { fetchDepartmentNews } from './news-scraper';

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
                await prisma.departmentNews.create({
                    data: {
                        title: item.title,
                        date: item.date,
                        link: item.link,
                        thumbnail: item.thumbnail || null,
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
