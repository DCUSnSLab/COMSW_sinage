'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function createContent(formData: FormData) {
    const title = formData.get('title') as string;
    const type = formData.get('type') as string; // TEXT, IMAGE, VIDEO
    const duration = parseInt(formData.get('duration') as string) || 10;

    let url = '';
    const body = formData.get('body') as string || ''; // Read body for all types

    if (type === 'TEXT') {
        // Body is already read above
    } else {
        const file = formData.get('file') as File;
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Ensure upload dir exists
            const uploadDir = join(process.cwd(), 'public', 'uploads');
            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) {
                // ignore if exists
            }

            // Sanitize filename: ASCII only, remove spaces/special chars, keep extension
            const ext = file.name.split('.').pop();
            const sanitizedBase = file.name.replace(/[^a-zA-Z0-9]/g, '');
            const filename = `${Date.now()}-${sanitizedBase}.${ext}`;
            const filepath = join(uploadDir, filename);

            await writeFile(filepath, buffer);
            url = `/uploads/${filename}`;
        } else {
            // Fallback if URL provided directly
            url = formData.get('url') as string || '';
        }
    }

    // Handle Thumbnail
    const thumbnailFile = formData.get('thumbnail') as File;
    let thumbnailUrl = '';
    if (thumbnailFile && thumbnailFile.size > 0) {
        const tBytes = await thumbnailFile.arrayBuffer();
        const tBuffer = Buffer.from(tBytes);
        const tUploadDir = join(process.cwd(), 'public', 'uploads');
        // Ensure dir (redundant but safe)
        try { await mkdir(tUploadDir, { recursive: true }); } catch { }

        const tFilename = `thumb-${Date.now()}-${thumbnailFile.name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
        await writeFile(join(tUploadDir, tFilename), tBuffer);
        thumbnailUrl = `/uploads/${tFilename}`;
    }

    await prisma.content.create({
        data: {
            title,
            type,
            url,
            thumbnail: thumbnailUrl,
            body,
            duration,
            isActive: true, // Default active
        },
    });

    revalidatePath('/admin/contents');
}

export async function deleteContent(id: string) {
    // Ideally delete file too, but skipping for MVP safety

    // First remove complications from any playlists
    await prisma.playlistContent.deleteMany({
        where: { contentId: id }
    });

    await prisma.content.delete({
        where: { id },
    });
    revalidatePath('/admin/contents');
}

export async function updateContent(id: string, formData: FormData) {
    const title = formData.get('title') as string;
    const body = formData.get('body') as string;
    const duration = parseInt(formData.get('duration') as string);
    const startDateRaw = formData.get('startDate') as string;
    const endDateRaw = formData.get('endDate') as string;

    await prisma.content.update({
        where: { id },
        data: {
            title,
            body,
            duration,
            startDate: startDateRaw ? new Date(startDateRaw) : null,
            endDate: endDateRaw ? new Date(endDateRaw) : null,
        }
    });
    revalidatePath('/admin/contents');
}

export async function toggleContentStatus(id: string, isActive: boolean) {
    await prisma.content.update({
        where: { id },
        data: { isActive },
    });
    revalidatePath('/admin/contents');
}
