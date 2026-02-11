'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { spawn } from 'child_process';

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
    } else {
        thumbnailUrl = formData.get('thumbnailUrl') as string || '';
    }

    // Handle YouTube Download via Python (pytube)
    let finalDuration = duration;

    if (type === 'VIDEO' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        try {
            console.log('Processing YouTube Video (Python):', url);

            const scriptPath = resolve(process.cwd(), 'src', 'scripts', 'download_youtube.py');
            const uploadDir = join(process.cwd(), 'public', 'uploads');

            // Promise wrapper for python script
            const pythonResult = await new Promise<any>((resolve, reject) => {
                const pyProcess = spawn('python', [scriptPath, url, uploadDir]);

                let dataString = '';
                let errorString = '';

                pyProcess.stdout.on('data', (data) => {
                    dataString += data.toString();
                });

                pyProcess.stderr.on('data', (data) => {
                    errorString += data.toString();
                });

                pyProcess.on('close', (code) => {
                    console.log('Python output:', dataString);
                    console.log('Python stderr:', errorString);

                    if (code !== 0) {
                        reject(new Error(`Python script exited with code ${code}: ${errorString}`));
                        return;
                    }
                    try {
                        const jsonMatch = dataString.trim().match(/\{[\s\S]*\}$/);
                        if (!jsonMatch) throw new Error('No JSON object found in stdout');
                        const result = JSON.parse(jsonMatch[0]);
                        resolve(result);
                    } catch (e) {
                        console.error("JSON Parse Error:", e);
                        reject(new Error(`Failed to parse Python output: ${dataString}`));
                    }
                });

                pyProcess.on('error', (err) => {
                    reject(new Error(`Python script failed to start: ${err.message}`));
                });
            });

            if (pythonResult.filename) {
                console.log('Python Download Success:', pythonResult);
                url = `/uploads/${pythonResult.filename}`;

                if (pythonResult.duration) {
                    finalDuration = Math.ceil(pythonResult.duration);
                }
            }

        } catch (e) {
            console.error('YouTube Python Processing Error:', e);
            // Fallback: keep original URL if download fails
        }
    }

    await prisma.content.create({
        data: {
            title,
            type,
            url,
            thumbnail: thumbnailUrl,
            body,
            duration: finalDuration,
            isActive: true, // Default active
        },
    });

    revalidatePath('/admin/contents');
}

export async function deleteContent(id: string) {
    // 1. Get content info to find file path
    const content = await prisma.content.findUnique({
        where: { id },
    });

    if (content) {
        // Remove file if it's a local upload
        if (content.url && content.url.startsWith('/uploads/')) {
            const filepath = join(process.cwd(), 'public', content.url);
            try {
                await unlink(filepath);
                console.log('Deleted file:', filepath);
            } catch (e) {
                console.error('Failed to delete file:', filepath, e);
            }
        }

        // Remove thumbnail if it's local
        if (content.thumbnail && content.thumbnail.startsWith('/uploads/')) {
            const thumbPath = join(process.cwd(), 'public', content.thumbnail);
            try { await unlink(thumbPath); } catch { }
        }

        // SYNC: If this content was imported from Department News, unmark it
        if (content.source === 'Department News' || content.source?.startsWith('Department News')) {
            try {
                // We match by title since we don't store the original link in Content
                // This assumes titles are unique enough or at least consistent
                await prisma.departmentNews.updateMany({
                    where: { title: content.title },
                    data: { isImported: false }
                });
                console.log(`Unmarked Department News as not imported: ${content.title}`);
            } catch (e) {
                console.error('Failed to sync Department News status:', e);
            }
        }
    }

    // First remove complications from any playlists
    await prisma.playlistContent.deleteMany({
        where: { contentId: id }
    });

    await prisma.content.delete({
        where: { id },
    });
    revalidatePath('/admin/contents');
    revalidatePath('/admin/department-news');
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

// Multi-Channel Auto-Crawl Actions
export async function getPlaylists() {
    return await prisma.playlist.findMany({
        orderBy: { updatedAt: 'desc' }
    });
}

export async function getCrawlSettingsList() {
    try {
        return await prisma.crawlSettings.findMany({
            where: { type: { not: 'DEPARTMENT_NEWS' } },
            orderBy: { updatedAt: 'desc' },
            include: { playlist: true }
        });
    } catch (e) {
        console.error("Failed to fetch with playlist relation, falling back to basic fetch:", e);
        return await prisma.crawlSettings.findMany({
            where: { type: { not: 'DEPARTMENT_NEWS' } },
            orderBy: { updatedAt: 'desc' }
        });
    }
}

export async function addCrawlSetting(name: string, channelUrl: string, checkInterval: number, playlistId?: string) {
    await prisma.crawlSettings.create({
        data: {
            name,
            channelUrl,
            checkInterval,
            playlistId: playlistId || null,
            isActive: true // Default active on creation
        }
    });
    revalidatePath('/admin/contents');
}

export async function updateCrawlSetting(id: number, data: { name?: string, channelUrl?: string, checkInterval?: number, isActive?: boolean, playlistId?: string | null }) {
    await prisma.crawlSettings.update({
        where: { id },
        data
    });
    revalidatePath('/admin/contents');
}

export async function deleteCrawlSetting(id: number) {
    await prisma.crawlSettings.delete({
        where: { id }
    });
    revalidatePath('/admin/contents');
}
