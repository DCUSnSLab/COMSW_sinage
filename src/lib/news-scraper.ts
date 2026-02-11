import * as cheerio from 'cheerio';

interface NewsItem {
    id: string;
    title: string;
    date: string;
    link: string;
    thumbnail?: string;
    views?: number;
}

interface NewsDetail {
    title: string;
    date: string;
    content: string; // HTML content
    images: string[];
}

const BASE_URL = 'https://com.cu.ac.kr';
const TIMEOUT_MS = 10000; // 10 seconds timeout

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            signal: controller.signal,
        });
        clearTimeout(id);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        clearTimeout(id);
        console.error(`Fetch failed for ${url}:`, error);
        throw error;
    }
}

export async function fetchDepartmentNews(page: number = 1): Promise<NewsItem[]> {
    const url = `${BASE_URL}/bbs/board.php?bo_table=pr_news&page=${page}`;
    try {
        const response = await fetchWithTimeout(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        const items: NewsItem[] = [];

        // Strategy: Find all anchor tags that look like news links.
        $('a[href*="pr_news"]').each((_, element) => {
            const $element = $(element);
            const href = $element.attr('href');
            if (!href) return;

            // Filter out paging links or other navigation
            if (!href.match(/\/pr_news\/\d+/)) return;

            const title = $element.text().trim();
            const $container = $element.closest('li'); // Assumption: List item

            let date = '';
            let thumbnail = '';

            // Try to find date in the container
            const containerText = $container.text();
            const dateMatch = containerText.match(/\d{4}-\d{2}-\d{2}/) || containerText.match(/\d{2}-\d{2}-\d{2}/);
            if (dateMatch) {
                date = dateMatch[0];
            }

            // Try to find thumbnail
            const $img = $container.find('img');
            if ($img.length > 0) {
                thumbnail = $img.attr('src') || '';
                if (thumbnail && !thumbnail.startsWith('http')) {
                    thumbnail = `${BASE_URL}${thumbnail}`;
                }
            }

            // ID extraction
            const idMatch = href.match(/\/pr_news\/(\d+)/);
            const id = idMatch ? idMatch[1] : '';

            if (title && id) {
                // Dedup
                if (!items.find(i => i.id === id)) {
                    items.push({
                        id,
                        title,
                        date,
                        link: href.startsWith('http') ? href : `${BASE_URL}${href}`,
                        thumbnail
                    });
                }
            }
        });

        return items;
    } catch (error) {
        console.error(`Failed to fetch news list page ${page}:`, error);
        return [];
    }
}

export async function fetchNewsDetail(url: string): Promise<NewsDetail> {
    try {
        const response = await fetchWithTimeout(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Common Gnuboard view structure (Custom Theme: sw_gallery_news)
        // Title: #sh_bo_v .tit
        // Date: .info ul li (First item)
        // Content: #bo_v_atc

        let title = $('#sh_bo_v .tit').text().trim();
        if (!title) {
            title = $('h1').first().text().trim(); // Fallback
        }

        // Extract date from info area
        let date = '';
        // Structure: <li><b>등록일</b> 25-12-22</li>
        const infoText = $('.info').text();
        const dateMatch = infoText.match(/\d{2,4}-\d{2}-\d{2}/);
        if (dateMatch) {
            date = dateMatch[0];
            // Normalize YY-MM-DD to YYYY-MM-DD if needed (assuming 20xx)
            if (date.match(/^\d{2}-\d{2}-\d{2}$/)) {
                date = '20' + date;
            }
        }

        // Content extraction
        const $content = $('#bo_v_atc');

        // Fix relative image paths in content
        const images: string[] = [];
        $content.find('img').each((_, img) => {
            let src = $(img).attr('src');
            if (src) {
                if (!src.startsWith('http')) {
                    src = `${BASE_URL}${src}`;
                    $(img).attr('src', src);
                }
                images.push(src);
            }
        });

        const content = $content.html() || '';

        return {
            title,
            date,
            content,
            images
        };
    } catch (error) {
        console.error(`Failed to fetch news detail ${url}:`, error);
        throw error;
    }
}
