'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createNotice(formData: FormData) {
    const message = formData.get('message') as string;

    // Optional: if we only want one active notice, we could deactivate others here.
    // For now, allow multiple and rotating or just showing all.

    await prisma.notice.create({
        data: {
            message,
            isActive: true,
        },
    });

    revalidatePath('/admin/notices');
}

export async function deleteNotice(id: string) {
    await prisma.notice.delete({
        where: { id },
    });
    revalidatePath('/admin/notices');
}

export async function toggleNoticeStatus(id: string, isActive: boolean) {
    await prisma.notice.update({
        where: { id },
        data: { isActive },
    });
    revalidatePath('/admin/notices');
}
