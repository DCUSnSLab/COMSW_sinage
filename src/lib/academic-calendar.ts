import * as cheerio from 'cheerio';

export interface CalendarEvent {
    date: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    content: string;
}

export async function fetchAcademicCalendar(year: number, semester: number): Promise<CalendarEvent[]> {
    try {
        // Semester 1 starts in March (03), Semester 2 in September (09)
        const targetMonth = semester === 1 ? '03' : '09';
        const targetUrl = `https://www.cu.ac.kr/life/academic/calendar?todayYear=${year}&todayM=${targetMonth}`;

        const response = await fetch(targetUrl);
        const html = await response.text();
        const $ = cheerio.load(html);

        const events: CalendarEvent[] = [];

        // Parsing logic based on common patterns or specific structure if known
        // The URL provided by user lists events like:
        // 2025-09-01 개강
        // 2025-09-01~2025-09-05 수강정정

        // Let's assume list items
        $('li').each((_, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            // Match YYYY-MM-DD or YYYY-MM-DD~YYYY-MM-DD followed by text
            const dateRegex = /(\d{4}-\d{2}-\d{2})(?:~(\d{4}-\d{2}-\d{2}))?\s+(.+)/;
            const match = text.match(dateRegex);

            if (match) {
                const startDateStr = match[1];
                const endDateStr = match[2];
                const contentText = match[3];

                // Since the page usually shows the whole semester or year, we blindly accept valid dates.
                // We might want to filter out events appearing from previous/next years if they happen to be in the list,
                // but usually the list is specific to the academic year/semester view.
                // For now, let's just grab everything valid.

                const event: CalendarEvent = {
                    date: startDateStr,
                    content: contentText
                };

                if (endDateStr) {
                    event.endDate = endDateStr;
                }

                // Check for duplicates
                if (!events.some(e => e.date === startDateStr && e.content === contentText && e.endDate === endDateStr)) {
                    events.push(event);
                }
            }
        });

        return events;
    } catch (e) {
        console.error("Failed to scrape calendar:", e);
        return [];
    }
}
