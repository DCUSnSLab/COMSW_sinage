import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string[] }> }) {
    try {
        const { filename } = await params;
        const path = filename.join('/');

        // Define paths
        // In Docker standalone, process.cwd() is /app
        // Files are in /app/public/uploads (mounted volume)
        const filePath = join(process.cwd(), 'public', 'uploads', path);

        // Check if file exists
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Read file
        const buffer = await readFile(filePath);

        // Determine content type
        const ext = path.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';

        switch (ext) {
            case 'jpg':
            case 'jpeg':
                contentType = 'image/jpeg';
                break;
            case 'png':
                contentType = 'image/png';
                break;
            case 'gif':
                contentType = 'image/gif';
                break;
            case 'webp':
                contentType = 'image/webp';
                break;
            case 'svg':
                contentType = 'image/svg+xml';
                break;
            case 'mp4':
                contentType = 'video/mp4';
                break;
            case 'webm':
                contentType = 'video/webm';
                break;
        }

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error("Error serving uploaded file:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
