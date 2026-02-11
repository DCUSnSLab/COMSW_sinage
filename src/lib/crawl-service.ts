import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { prisma } from '@/lib/db';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { revalidatePath } from 'next/cache';

// Reusing logic from route.ts
export async function crawlYouTubeChannel(channelUrl: string) {
    if (!channelUrl) throw new Error('Channel URL is required');

    // 1. Fetch channel page to find RSS link
    const channelRes = await fetch(channelUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!channelRes.ok) throw new Error('Failed to fetch channel page');
    const channelHtml = await channelRes.text();
    const $ = cheerio.load(channelHtml);

    // Try to find channel ID
    let channelId = $('meta[itemprop="channelId"]').attr('content');
    if (!channelId) {
        // Fallback: Look for "browseId":"UC..."
        const scriptContent = channelHtml.match(/"browseId":"(UC[\w-]+)"/);
        if (scriptContent) {
            channelId = scriptContent[1];
        }
    }

    if (!channelId) {
        // Check if URL is already a channel ID URL
        const match = channelUrl.match(/youtube\.com\/channel\/(UC[\w-]+)/);
        if (match) {
            channelId = match[1];
        } else {
            throw new Error('Could not detect Channel ID');
        }
    }

    // 2. Fetch RSS Feed
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssRes = await fetch(rssUrl);
    if (!rssRes.ok) throw new Error('Failed to fetch RSS feed');
    const rssXml = await rssRes.text();

    // 3. Parse XML
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const rssData = parser.parse(rssXml);
    const entries = rssData.feed.entry || [];
    const videos = Array.isArray(entries) ? entries : [entries];

    // 4. Filter and Format
    const filteredVideos = videos.filter((video: any) => {
        const title = video.title || '';
        const desc = video['media:group']['media:description'] || '';
        return title.includes('홍보') || desc.includes('홍보');
    }).map((video: any) => ({
        id: video['yt:videoId'],
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video['yt:videoId']}`,
        thumbnail: video['media:group']['media:thumbnail']['@_url'],
        description: video['media:group']['media:description'],
        publishedAt: video.published
    }));

    return filteredVideos;
}

// Reusing/Refactoring logic from actions.ts
export async function downloadAndSaveVideo(videoUrl: string, title: string, body: string, sourceName?: string, playlistId?: string) {
    try {
        console.log('Auto-Downloading:', videoUrl);

        const scriptPath = resolve(process.cwd(), 'src', 'scripts', 'download_youtube.py');
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        const pythonResult = await new Promise<any>((resolve, reject) => {
            const pyProcess = spawn('python', [scriptPath, videoUrl, uploadDir]);

            let dataString = '';
            let errorString = '';

            pyProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pyProcess.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            pyProcess.on('close', (code) => {
                console.log('Python output (Auto):', dataString);
                if (errorString) console.log('Python stderr (Auto):', errorString);

                if (code !== 0) {
                    reject(new Error(`Python script exited with code ${code}`));
                    return;
                }

                try {
                    const result = JSON.parse(dataString);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Failed to parse Python output'));
                }
            });
        });

        // Save to DB
        const content = await prisma.content.create({
            data: {
                title: pythonResult.title || title,
                type: 'VIDEO',
                url: `/uploads/${pythonResult.filename}`, // Local path
                thumbnail: pythonResult.thumbnail,
                body: body,
                duration: pythonResult.duration || 10,
                source: `YouTube: ${sourceName || 'Auto-Crawl'}`
            }
        });

        // 3. Auto-Assign to Playlist if provided
        if (playlistId) {
            // Get current max order
            const lastItem = await prisma.playlistContent.findFirst({
                where: { playlistId },
                orderBy: { displayOrder: 'desc' }
            });
            const nextOrder = (lastItem?.displayOrder ?? 0) + 1;

            await prisma.playlistContent.create({
                data: {
                    playlistId,
                    contentId: content.id,
                    displayOrder: nextOrder,
                }
            });
            console.log(`[Auto-Crawl] Assigned video to playlist ${playlistId}`);
        }

        try {
            revalidatePath('/admin/contents');
        } catch (err) {
            console.log('Skipping revalidatePath (Background Context)');
        }
        console.log('Auto-Download Success:');
        return true;

    } catch (e) {
        console.error('Auto-Download Failed:', e);
        return false;
    }
}

