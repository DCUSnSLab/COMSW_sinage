import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';

export async function POST(request: Request) {
    try {
        const { channelUrl } = await request.json();

        if (!channelUrl) {
            return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 });
        }

        // 1. Fetch channel page to find RSS link
        const channelRes = await fetch(channelUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!channelRes.ok) {
            return NextResponse.json({ error: 'Failed to access channel page' }, { status: 400 });
        }

        const channelHtml = await channelRes.text();
        const $ = cheerio.load(channelHtml);

        // Find RSS URL - standard YouTube channel structure often links to it
        // Or if given a channel ID directly, we can construct it: https://www.youtube.com/feeds/videos.xml?channel_id=ID
        // But extracting channelId is safer.

        let channelId = '';

        // Try to find channel ID in meta tags
        // <meta itemprop="channelId" content="UC...">
        let metaChannelId = $('meta[itemprop="channelId"]').attr('content');

        if (!metaChannelId) {
            // Fallback 1: Look for "browseId":"UC..." in the script tags (common in YouTube's initial data)
            const scriptContent = channelHtml.match(/"browseId":"(UC[\w-]+)"/);
            if (scriptContent) {
                metaChannelId = scriptContent[1];
            }
        }

        if (metaChannelId) {
            channelId = metaChannelId;
        } else {
            // Fallback 2: try to match URL pattern if it's already a channel URL
            // https://www.youtube.com/channel/UC...
            const match = channelUrl.match(/\/channel\/(UC[\w-]+)/);
            if (match) {
                channelId = match[1];
            } else {
                return NextResponse.json({ error: 'Could not detect Channel ID. Please use the full channel URL (e.g. https://www.youtube.com/@ChannelName)' }, { status: 400 });
            }
        }

        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

        // 2. Fetch RSS Feed
        const rssRes = await fetch(rssUrl);
        if (!rssRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch video feed' }, { status: 500 });
        }

        const xmlData = await rssRes.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const result = parser.parse(xmlData);

        const entries = result.feed?.entry || [];
        // fast-xml-parser returns single object if only one entry, ensure array
        const videos = Array.isArray(entries) ? entries : [entries];

        // 3. Filter by keyword "홍보"
        const keyword = "홍보";

        const filteredVideos = videos.filter((v: any) => {
            const title = v.title || '';
            const description = v['media:group']?.['media:description'] || '';
            return title.includes(keyword) || description.includes(keyword);
        }).map((v: any) => ({
            id: v['yt:videoId'],
            title: v.title,
            description: v['media:group']?.['media:description'] || '',
            url: `https://www.youtube.com/watch?v=${v['yt:videoId']}`,
            thumbnail: v['media:group']?.['media:thumbnail']?.['@_url'],
            publishedAt: v.published
        }));

        // 4. Filter out already existing contents (by Title)
        const { prisma } = await import('@/lib/db');
        const existingContents = await prisma.content.findMany({
            where: {
                title: { in: filteredVideos.map(v => v.title) },
                type: 'VIDEO'
            },
            select: { title: true }
        });

        const existingTitles = new Set(existingContents.map(c => c.title));
        const finalVideos = filteredVideos.filter(v => !existingTitles.has(v.title));

        return NextResponse.json({ videos: finalVideos });

    } catch (error) {
        console.error('Crawl Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
