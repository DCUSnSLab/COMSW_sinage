import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { ContentList } from '@/components/admin/ContentList';

export default async function ContentsPage() {
    const contents = await prisma.content.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Content Asset Management</h1>
            </div>

            <ContentList initialContents={contents} />
        </div>
    );
}
