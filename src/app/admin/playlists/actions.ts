'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPlaylist(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await prisma.playlist.create({
        data: {
            name,
            description,
        },
    });

    revalidatePath('/admin/playlists');
}

export async function deletePlaylist(id: string) {
    await prisma.playlist.delete({
        where: { id },
    });
    revalidatePath('/admin/playlists');
}

export async function assignDeviceToPlaylist(deviceId: string, playlistId: string) {
    // Basic assignment: remove old, add new
    await prisma.devicePlaylist.deleteMany({
        where: { deviceId }
    });

    if (playlistId) {
        await prisma.devicePlaylist.create({
            data: {
                deviceId,
                playlistId,
                isActive: true
            }
        });
    }
    revalidatePath('/admin/devices');
}

export async function addContentToPlaylist(playlistId: string, contentId: string) {
    // Get max order
    const maxOrder = await prisma.playlistContent.findFirst({
        where: { playlistId },
        orderBy: { displayOrder: 'desc' },
    });

    const nextOrder = (maxOrder?.displayOrder ?? 0) + 1;

    await prisma.playlistContent.create({
        data: {
            playlistId,
            contentId,
            displayOrder: nextOrder,
            zone: 'MAIN', // Default
        },
    });

    revalidatePath(`/admin/playlists/${playlistId}`);
}

export async function removeContentFromPlaylist(id: string) {
    await prisma.playlistContent.delete({
        where: { id },
    });
    // We should revalidate the playlist page, but we don't know the ID here easily without fetch.
    // Actually we need to return path or just revalidate admin/playlists
    revalidatePath('/admin/playlists');
}

export async function updateContentZone(id: string, zone: string) {
    await prisma.playlistContent.update({
        where: { id },
        data: { zone }
    });
    revalidatePath('/admin/playlists');
}
