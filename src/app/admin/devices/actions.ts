'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createDevice(formData: FormData) {
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const layoutMode = formData.get('layoutMode') as string;
    const splitRatio = parseInt(formData.get('splitRatio') as string) || 50;
    const crawlPlaylistId = formData.get('crawlPlaylistId') as string;
    const crawlerInterval = parseInt(formData.get('crawlerInterval') as string) || 5;

    await prisma.device.create({
        data: {
            name,
            location,
            layoutMode: layoutMode || 'FULL',
            splitRatio,
            crawlPlaylistId: crawlPlaylistId || null,
            crawlerInterval,
        },
    });

    revalidatePath('/admin/devices');
}

export async function updateDevice(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const layoutMode = formData.get('layoutMode') as string;
    const splitRatio = parseInt(formData.get('splitRatio') as string) || 50;
    const crawlPlaylistId = formData.get('crawlPlaylistId') as string;
    const crawlerInterval = parseInt(formData.get('crawlerInterval') as string) || 5;

    await prisma.device.update({
        where: { id },
        data: {
            name,
            location,
            layoutMode,
            splitRatio,
            crawlPlaylistId: crawlPlaylistId || null,
            crawlerInterval,
        },
    });
    revalidatePath('/admin/devices');
}

export async function deleteDevice(id: string) {
    await prisma.device.delete({
        where: { id },
    });
    revalidatePath('/admin/devices');
}

export async function toggleDeviceStatus(id: string, isActive: boolean) {
    await prisma.device.update({
        where: { id },
        data: { isActive },
    });
    revalidatePath('/admin/devices');
}

export async function assignCrawlerPlaylist(deviceId: string, playlistId: string) {
    await prisma.device.update({
        where: { id: deviceId },
        data: { crawlPlaylistId: playlistId || null },
    });
    revalidatePath('/admin/devices');
}
