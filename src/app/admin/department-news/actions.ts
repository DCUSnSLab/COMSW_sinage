'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { fetchDepartmentNews, fetchNewsDetail } from '@/lib/news-scraper';
import { crawlAndSaveDepartmentNews } from '@/lib/news-service';

export async function getStoredNewsList() {
    try {
        const news = await prisma.departmentNews.findMany({
            orderBy: { date: 'desc' },
            take: 50
        });
        return news;
    } catch (error) {
        console.error("Failed to fetch stored news:", error);
        return [];
    }
}

export async function forceCrawl() {
    try {
        const result = await crawlAndSaveDepartmentNews();
        revalidatePath('/admin/department-news');
        return result;
    } catch (error) {
        return { success: false, error };
    }
}

export async function getNewsSettings() {
    try {
        let settings = await prisma.crawlSettings.findFirst({
            where: { type: 'DEPARTMENT_NEWS' }
        });

        if (!settings) {
            // Create default settings if not exists
            settings = await prisma.crawlSettings.create({
                data: {
                    type: 'DEPARTMENT_NEWS',
                    channelUrl: 'department-news-scraper', // Placeholder for unique constraint
                    name: 'Department News',
                    isActive: false,
                    checkInterval: 60
                }
            });
        }
        return settings;
    } catch (error) {
        console.error("Failed to fetch news settings:", error);
        return null;
    }
}

export async function updateNewsSettings(isActive: boolean, checkInterval: number) {
    try {
        const settings = await getNewsSettings();
        if (!settings) throw new Error("Settings not found");

        await prisma.crawlSettings.update({
            where: { id: settings.id },
            data: {
                isActive,
                checkInterval
            }
        });
        revalidatePath('/admin/department-news');
        return { success: true };
    } catch (error) {
        console.error("Failed to update news settings:", error);
        return { success: false, error: String(error) };
    }
}

export async function importNewsContent(url: string, type: 'TEXT' | 'IMAGE') {
    try {
        const detail = await fetchNewsDetail(url);

        let contentBody = detail.content;
        let contentUrl = null;
        let contentThumbnail = null;

        if (type === 'IMAGE' && detail.images.length > 0) {
            contentUrl = detail.images[0]; // Use first image as main content
            contentThumbnail = detail.images[0];
        }

        await prisma.content.create({
            data: {
                title: detail.title,
                body: type === 'TEXT' ? contentBody : null,
                type: type,
                url: contentUrl,
                thumbnail: contentThumbnail,
                duration: 10,
                isActive: true,
                source: 'Department News',
            }
        });

        // Mark as imported in DepartmentNews table (optional, but good for UI)
        await prisma.departmentNews.update({
            where: { link: url },
            data: { isImported: true }
        }).catch(() => { }); // Ignore if not found in DB (e.g. direct import)

        revalidatePath('/admin/department-news');
        return { success: true };
    } catch (error) {
        console.error("Failed to import news:", error);
        return { success: false, error: String(error) };
    }
}
export async function getNewsDetail(id: string) {
    try {
        const item = await prisma.departmentNews.findUnique({
            where: { id }
        });

        if (!item) return null;

        // If content is missing, fetch it now (Lazy Crawling)
        if (!item.content) {
            console.log(`Lazy fetching content for: ${item.title}`);
            const detail = await fetchNewsDetail(item.link);

            const updated = await prisma.departmentNews.update({
                where: { id },
                data: {
                    content: detail.content,
                    images: detail.images,
                    // Also update date if we found a better one and existing is empty or we want to trust detail more
                    date: (item.date === '' && detail.date) ? detail.date : item.date,
                    // Update Title if detail has a better one (full title)
                    title: detail.title || item.title
                }
            });

            // If we found a date and the original was empty, explicitly update it
            if (!item.date && detail.date) {
                await prisma.departmentNews.update({
                    where: { id },
                    data: { date: detail.date }
                });
            }

            return updated;
            return updated;
        }

        return item;
    } catch (error) {
        console.error("Failed to get news detail:", error);
        return null;
    }
}
