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

export async function fetchDepartmentNews(page: number = 1): Promise<NewsItem[]> {
    const url = `${BASE_URL}/bbs/board.php?bo_table=pr_news&page=${page}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];

    // Inspecting the HTML structure from the provided chunk:
    // It seems like a standard board list.
    // The structure typically involves a list container (ul or div) and list items (li).
    // Based on the chunk: "https://com.cu.ac.kr/pr_news/24 ... [경북테크노파크 게임AI 사업 루키 챌린저스 3...]"
    // It seems the structure might be customized.

    // Let's look for the main board list container. Common classes in Korean CMS (Gnuboard): 'tbl_head01', 'list-board', etc.
    // However, since we don't have the exact HTML, I will assume a generic structure first and refine it.
    // The chunk shows links like `https://com.cu.ac.kr/pr_news/24`.
    // This suggests a rewrite rule or a specific href format.

    // ADJUSTMENT: Based on the text content seen in the previous turn's `view_url_content`:
    // "https://com.cu.ac.kr/pr_news/24 ... [Title] ..."
    // It's likely a list of <li> or <div> elements.

    // I will try to target typical list elements.
    // If this fails, I will need to inspect the page source again more carefully.
    // For now, I'll write a robust selector strategy.

    // Strategy: Find all anchor tags that look like news links.
    $('a[href*="pr_news"]').each((_, element) => {
        const $element = $(element);
        const href = $element.attr('href');
        if (!href) return;

        // Filter out paging links or other navigation
        if (!href.match(/\/pr_news\/\d+/)) return;

        const title = $element.text().trim();
        // In many boards, the date is in a sibling element or a child element.
        // I might need to traverse up to the container <li> or <tr>.
        const $container = $element.closest('li'); // Assumption: List item

        let date = '';
        let thumbnail = '';

        // Try to find date in the container
        // Common classes: 'date', 'datetime', 'td_datetime'
        // Or just identifying by regex YYYY-MM-DD
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
            // Dedup: sometimes detailed view links appear multiple times (img + title).
            // Check if we already have this ID.
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
}

export async function fetchNewsDetail(url: string): Promise<NewsDetail> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Common Gnuboard view structure
    // Title: #bo_v_title .bo_v_tit
    // Date: #bo_v_info .bo_v_info_lst
    // Content: #bo_v_con

    const title = $('#bo_v_title .bo_v_tit').text().trim() || $('h1').first().text().trim(); // Fallback

    // Extract date from info area
    let date = '';
    $('#bo_v_info').text().split(' ').forEach(part => {
        if (part.match(/\d{4}-\d{2}-\d{2}/)) date = part;
    });

    // Content extraction
    // We want to capture text and images.
    // We might want to save images as local files later, but for now getting their URLs is fine.
    const $content = $('#bo_v_con');

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
}
