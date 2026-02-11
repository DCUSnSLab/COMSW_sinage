'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPlaylist(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string; // 'GENERAL' or 'CRAWLER'

    await prisma.playlist.create({
        data: {
            name,
            description,
            type: type || 'GENERAL',
        },
    });

    revalidatePath('/admin/playlists');
}

export async function deletePlaylist(id: string) {
    // 1. Remove dependencies
    await prisma.playlistContent.deleteMany({
        where: { playlistId: id }
    });

    await prisma.devicePlaylist.deleteMany({
        where: { playlistId: id }
    });

    // 2. Unlink CrawlSettings
    await prisma.crawlSettings.updateMany({
        where: { playlistId: id },
        data: { playlistId: null }
    });

    // 3. Delete Playlist
    await prisma.playlist.delete({
        where: { id },
    });
    revalidatePath('/admin/playlists');
}

export async function updatePlaylist(id: string, name: string, description: string) {
    await prisma.playlist.update({
        where: { id },
        data: {
            name,
            description
        }
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

export async function reorderPlaylistContent(id: string, direction: 'UP' | 'DOWN') {
    const item = await prisma.playlistContent.findUnique({
        where: { id },
    });

    if (!item) return;

    const { playlistId, displayOrder } = item;

    // Find the item to swap with
    let targetItem;
    if (direction === 'UP') {
        targetItem = await prisma.playlistContent.findFirst({
            where: {
                playlistId,
                displayOrder: { lt: displayOrder },
            },
            orderBy: { displayOrder: 'desc' },
        });
    } else {
        targetItem = await prisma.playlistContent.findFirst({
            where: {
                playlistId,
                displayOrder: { gt: displayOrder },
            },
            orderBy: { displayOrder: 'asc' },
        });
    }

    if (targetItem) {
        // Swap orders using a transaction
        await prisma.$transaction([
            prisma.playlistContent.update({
                where: { id: item.id },
                data: { displayOrder: targetItem.displayOrder },
            }),
            prisma.playlistContent.update({
                where: { id: targetItem.id },
                data: { displayOrder: displayOrder },
            }),
        ]);

        revalidatePath(`/admin/playlists/${playlistId}`);
    }
}

export async function movePlaylistContent(id: string, newIndex: number) {
    const item = await prisma.playlistContent.findUnique({
        where: { id },
    });

    if (!item) return;

    const { playlistId, displayOrder: oldIndex } = item;

    if (oldIndex === newIndex) return; // No change

    // 1. Get all items in this playlist, ordered
    const allItems = await prisma.playlistContent.findMany({
        where: { playlistId },
        orderBy: { displayOrder: 'asc' }
    });

    // 2. Calculate new order locally
    // Remove item from old position
    const currentItem = allItems.find(i => i.id === id);
    if (!currentItem) return;

    const remainingItems = allItems.filter(i => i.id !== id);

    // Insert at new position
    // (If newIndex is out of bounds, push to end or unshift)
    remainingItems.splice(newIndex, 0, currentItem);

    // 3. Update all items with new displayOrder
    // We can use a transaction for safety
    const updates = remainingItems.map((item, index) => {
        return prisma.playlistContent.update({
            where: { id: item.id },
            data: { displayOrder: index + 1 } // 1-based index
        });
    });

    await prisma.$transaction(updates);

    revalidatePath(`/admin/playlists/${playlistId}`);
}
