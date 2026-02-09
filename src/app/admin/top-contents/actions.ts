'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createSchedule(formData: FormData) {
    const dateRaw = formData.get('date') as string;
    const content = formData.get('content') as string;
    const endDateRaw = formData.get('endDate') as string;

    if (!dateRaw || !content) return;

    await prisma.schedule.create({
        data: {
            date: new Date(dateRaw),
            endDate: endDateRaw ? new Date(endDateRaw) : null,
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
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    // Find schedules where the range overlaps with the month
    // (Start <= MonthEnd) AND (End >= MonthStart)
    // Or single date within month
    const schedules = await prisma.schedule.findMany({
        where: {
            OR: [
                // Case 1: Single date within month
                {
                    endDate: null,
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
                // Case 2: Range overlaps with month
                {
                    NOT: { endDate: null },
                    date: { lte: end },
                    endDate: { gte: start },
                }
            ]
        },
        orderBy: { date: 'asc' },
    });

    return schedules;
}

export async function getSchoolCalendarEvents(year: number, semester: number) {
    try {
        const { fetchAcademicCalendar } = await import('@/lib/academic-calendar');
        return await fetchAcademicCalendar(year, semester);
    } catch (e) {
        console.error("Error fetching school calendar:", e);
        return [];
    }
}

export async function importScheduleFromCalendar(events: { date: Date, endDate?: Date, content: string }[]) {
    if (!events || events.length === 0) return;

    await prisma.schedule.createMany({
        data: events.map(e => ({
            date: e.date,
            endDate: e.endDate || null,
            content: e.content
        }))
    });


    revalidatePath('/admin/top-contents');
}
