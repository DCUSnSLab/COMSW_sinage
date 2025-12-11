import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { NoticeList } from '@/components/admin/NoticeList';

export default async function NoticesPage() {
    const notices = await prisma.notice.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Notice Management</h1>
            </div>

            <NoticeList initialNotices={notices} />
        </div>
    );
}
