// 저장된 뉴스 데이터를 모두 삭제하고 초기화하는 도구
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const deleted = await prisma.departmentNews.deleteMany({});
        console.log(`Deleted ${deleted.count} news items.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
