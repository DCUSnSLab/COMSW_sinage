// 크롤링이 정상적으로 작동하는지 확인하는 테스트용 코드
import { crawlAndSaveDepartmentNews } from '../src/lib/news-service';
import { prisma } from '../src/lib/db';

async function main() {
    console.log("Starting test crawl...");
    await crawlAndSaveDepartmentNews();
    console.log("Crawl finished.");

    // Verify results
    const news = await prisma.departmentNews.findMany({
        take: 5,
        orderBy: { crawledAt: 'desc' }
    });

    console.log("Latest 5 news items:");
    news.forEach(n => {
        console.log(`[${n.date}] ${n.title} (Content Length: ${n.content?.length || 0})`);
    });
}

main();
