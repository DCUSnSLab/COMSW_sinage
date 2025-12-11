'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createSchedule(formData: FormData) {
    const dateRaw = formData.get('date') as string;
    const content = formData.get('content') as string;

    if (!dateRaw || !content) return;

    await prisma.schedule.create({
        data: {
            date: new Date(dateRaw),
            content,
        },
    });

    revalidatePath('/admin/top-contents');
}

export async function deleteSchedule(id: string) {
    await prisma.schedule.delete({
        where: { id },
    });
    revalidatePath('/admin/top-contents');
}

export async function getMonthSchedules(year: number, month: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const schedules = await prisma.schedule.findMany({
        where: {
            date: {
                gte: start,
                lte: end,
            },
        },
        orderBy: { date: 'asc' },
    });

    return schedules;
}
