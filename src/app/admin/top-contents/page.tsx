'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSchedule, deleteSchedule, getMonthSchedules, getSchoolCalendarEvents, importScheduleFromCalendar } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, Download, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, getDay, addDays } from 'date-fns';

export default function TopContentsPage() {
    const [date, setDate] = useState(new Date());
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importYear, setImportYear] = useState(new Date().getFullYear());
    const [importSemester, setImportSemester] = useState<1 | 2>(new Date().getMonth() < 8 ? 1 : 2);
    const [scrapedEvents, setScrapedEvents] = useState<{ date: string, endDate?: string, content: string }[]>([]);
    const [selectedImportEvents, setSelectedImportEvents] = useState<Set<number>>(new Set());
    const [isFetching, setIsFetching] = useState(false);

    const router = useRouter();

    const fetchSchedules = async () => {
        const data = await getMonthSchedules(date.getFullYear(), date.getMonth());
        setSchedules(data);
    };

    useEffect(() => {
        fetchSchedules();
    }, [date]);

    // Calendar logic using date-fns
    const monthStart = startOfMonth(date);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(endOfMonth(date));

    // Memoize calendar days to avoid re-calc on every render
    const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    const weeks = useMemo(() => {
        const _weeks: Date[][] = [];
        let currentWeek: Date[] = [];
        calendarDays.forEach((day) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                _weeks.push(currentWeek);
                currentWeek = [];
            }
        });
        return _weeks;
    }, [calendarDays]);

    const getEventSegments = (weekDates: Date[]) => {
        const weekStart = weekDates[0];
        const weekEnd = weekDates[6];

        // Find events that overlap with this week
        const weekEvents = schedules.filter(s => {
            const sDate = new Date(s.date);
            const eDate = s.endDate ? new Date(s.endDate) : sDate;
            // Overlap: (StartA <= EndB) and (EndA >= StartB)
            return sDate <= weekEnd && eDate >= weekStart;
        }).sort((a, b) => {
            // Sort by duration desc, then start date asc
            const aStart = new Date(a.date).getTime();
            const bStart = new Date(b.date).getTime();

            const aEnd = a.endDate ? new Date(a.endDate).getTime() : aStart;
            const bEnd = b.endDate ? new Date(b.endDate).getTime() : bStart;

            const aDuration = aEnd - aStart;
            const bDuration = bEnd - bStart;

            if (aDuration !== bDuration) return bDuration - aDuration; // Longer first
            return aStart - bStart; // Precede
        });

        // Assign rows logic
        const rows: { startIndex: number, duration: number, event: any }[][] = [];
        const processedEvents = weekEvents.map(event => {
            const sDate = new Date(event.date);
            const eDate = event.endDate ? new Date(event.endDate) : sDate;

            // Clip to week boundaries
            const start = sDate < weekStart ? weekStart : sDate;
            const end = eDate > weekEnd ? weekEnd : eDate;

            const startIndex = getDay(start); // 0-6
            const duration = getDay(end) - startIndex + 1;

            // Find first available row
            let rowIndex = 0;
            while (true) {
                const isOccupied = rows[rowIndex]?.some(placed => {
                    const pStart = placed.startIndex;
                    const pEnd = pStart + placed.duration - 1;
                    const cStart = startIndex;
                    const cEnd = startIndex + duration - 1;
                    return Math.max(pStart, cStart) <= Math.min(pEnd, cEnd);
                });

                if (!isOccupied) {
                    if (!rows[rowIndex]) rows[rowIndex] = [];
                    rows[rowIndex].push({ startIndex, duration, event });
                    break;
                }
                rowIndex++;
            }

            return {
                ...event,
                startIndex,
                duration,
                rowIndex
            };
        });

        return processedEvents;
    };

    const handleDateClick = (dayStr: string) => { // Updated to accept ISO string or date object if needed, but keeping simple
        // Original handler used day number.
        // New handler should use the specific Date object clicked.
        const clickedDate = new Date(dayStr);
        setSelectedDate(clickedDate);
        setIsModalOpen(true);
    };

    const handleCreate = async (formData: FormData) => {
        await createSchedule(formData);
        setIsModalOpen(false);
        fetchSchedules();
    };

    const handleDelete = async (id: string, content: string) => {
        if (confirm(`'${content}' 일정을 정말 삭제하시겠습니까?`)) {
            await deleteSchedule(id);
            fetchSchedules();
        }
    };

    const fetchSchoolEvents = async () => {
        setIsFetching(true);
        try {
            const events = await getSchoolCalendarEvents(importYear, importSemester);
            setScrapedEvents(events);
            setSelectedImportEvents(new Set(events.map((_, i) => i)));
        } finally {
            setIsFetching(false);
        }
    };

    const toggleImportEvent = (index: number) => {
        const newSet = new Set(selectedImportEvents);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedImportEvents(newSet);
    };

    const handleImport = async () => {
        const eventsToImport = scrapedEvents
            .filter((_, i) => selectedImportEvents.has(i))
            .map(e => ({
                date: new Date(e.date),
                endDate: e.endDate ? new Date(e.endDate) : undefined,
                content: e.content
            }));

        await importScheduleFromCalendar(eventsToImport);
        setIsImportModalOpen(false);
        fetchSchedules();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Top Content Management</h1>
            </div>

            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="schedule">Schedule Wrapper</TabsTrigger>
                    <TabsTrigger value="test">Test Widget (Empty)</TabsTrigger>
                </TabsList>

                <TabsContent value="schedule">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5" />
                                Weekly Schedule Input
                            </CardTitle>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        setIsImportModalOpen(true);
                                        setScrapedEvents([]);
                                    }}
                                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-green-700 transition mr-4"
                                >
                                    <Download className="w-4 h-4" />
                                    Import School Calendar
                                </button>
                                <button onClick={() => setDate(new Date(date.setMonth(date.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="font-medium text-lg min-w-[100px] text-center">
                                    {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setDate(new Date(date.setMonth(date.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-7 bg-gray-50 border-b">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                        <div key={d} className={cn(
                                            "py-2 text-center text-sm font-medium",
                                            d === 'Sun' ? "text-red-500" : "text-gray-500",
                                            i !== 6 && "border-r border-gray-200"
                                        )}>
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="divide-y relative bg-white">
                                    {weeks.map((week, weekIdx) => {
                                        const segments = getEventSegments(week);
                                        const maxRow = segments.length > 0 ? Math.max(...segments.map(s => s.rowIndex)) + 1 : 0;
                                        const rowHeight = 24;
                                        const headerHeight = 28;
                                        const minHeight = 100;
                                        const dynamicHeight = headerHeight + (maxRow * rowHeight) + 10;
                                        const cellHeight = Math.max(minHeight, dynamicHeight);

                                        return (
                                            <div key={weekIdx} className="grid grid-cols-7 relative group">
                                                {/* Background Cells */}
                                                {week.map((day) => {
                                                    const isTargetMonth = isSameMonth(day, monthStart);
                                                    const isToday = isSameDay(day, new Date());
                                                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                                                    const isSunday = day.getDay() === 0;
                                                    const isSaturday = day.getDay() === 6;

                                                    return (
                                                        <div
                                                            key={day.toString()}
                                                            onClick={() => handleDateClick(day.toISOString())}
                                                            className={cn(
                                                                "relative cursor-pointer transition hover:bg-gray-50",
                                                                !isTargetMonth && "bg-gray-50/30 text-gray-400",
                                                                isToday && "bg-blue-50/30",
                                                                isSelected && "ring-2 ring-inset ring-blue-500",
                                                                !isSaturday && "border-r border-gray-200"
                                                            )}
                                                            style={{ height: cellHeight }}
                                                        >
                                                            <div className={cn(
                                                                "p-1 text-sm font-medium text-center pointer-events-none",
                                                                isToday ? "text-blue-600" : isSunday ? "text-red-500" : "text-gray-700"
                                                            )}>
                                                                {format(day, 'd')}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Events Layer */}
                                                <div className="absolute inset-0 top-7 w-full pointer-events-none">
                                                    {segments.map((segment, idx) => (
                                                        <div
                                                            key={`${segment.id}-${idx}`}
                                                            className={cn(
                                                                "absolute h-5 px-2 rounded text-xs leading-5 truncate shadow-sm cursor-pointer pointer-events-auto group/item flex items-center justify-between",
                                                                "bg-blue-100 text-blue-800 border-blue-200 border hover:bg-blue-200 z-10"
                                                            )}
                                                            style={{
                                                                left: `calc(${(segment.startIndex / 7) * 100}% + 2px)`,
                                                                width: `calc(${(segment.duration / 7) * 100}% - 4px)`,
                                                                top: `${segment.rowIndex * rowHeight}px`,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDateClick(new Date(segment.date).toISOString());
                                                            }}
                                                        >
                                                            <span className="truncate">{segment.content}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(segment.id, segment.content);
                                                                }}
                                                                className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-blue-300 rounded transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3 text-red-600" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test Widget Content</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl m-6">
                            Coming Soon...
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add/Edit Schedule Modal */}
            {isModalOpen && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md bg-white animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle>Manage Schedules - {selectedDate.toLocaleDateString()}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* List existing for date (including ranges overlapping this date) */}
                            {schedules.filter(s => {
                                const sDate = new Date(s.date);
                                sDate.setHours(0, 0, 0, 0);
                                const eDate = s.endDate ? new Date(s.endDate) : new Date(sDate);
                                eDate.setHours(23, 59, 59, 999);

                                const target = new Date(selectedDate);
                                target.setHours(12, 0, 0, 0); // Middle of day to avoid edge cases

                                return target >= sDate && target <= eDate;
                            }).map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                    <div className="flex flex-col">
                                        <span>{s.content}</span>
                                        {s.endDate && (
                                            <span className="text-xs text-gray-500">
                                                {new Date(s.date).toLocaleDateString()} ~ {new Date(s.endDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => handleDelete(s.id, s.content)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <form action={handleCreate} className="flex flex-col gap-2 pt-4 border-t">
                                <input type="hidden" name="date" value={selectedDate.toISOString()} />
                                <div className="flex gap-2">
                                    <input name="content" required placeholder="New schedule..." className="flex-1 px-3 py-2 border rounded-md" />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <label>End Date (Optional):</label>
                                    <input type="date" name="endDate" className="border rounded px-2 py-1" min={format(selectedDate, 'yyyy-MM-dd')} />
                                </div>
                                <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 w-full flex justify-center">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </form>

                            <div className="flex justify-end pt-2">
                                <button onClick={() => setIsModalOpen(false)} className="text-sm text-gray-500 hover:underline">Close</button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Import Calendar Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-2xl bg-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <CardHeader>
                            <CardTitle>Import School Calendar</CardTitle>
                            <CardDescription>Fetch and import events from www.cu.ac.kr</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                            <div className="flex gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setImportYear(importYear - 1)} className="p-1 hover:bg-gray-200 rounded">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="font-bold text-lg min-w-[80px] text-center">
                                        {importYear}
                                    </span>
                                    <button onClick={() => setImportYear(importYear + 1)} className="p-1 hover:bg-gray-200 rounded">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    <div className="bg-gray-200 p-1 rounded-lg flex text-sm font-medium">
                                        <button
                                            onClick={() => setImportSemester(1)}
                                            className={cn(
                                                "px-3 py-1 rounded-md transition",
                                                importSemester === 1 ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            1st Sem
                                        </button>
                                        <button
                                            onClick={() => setImportSemester(2)}
                                            className={cn(
                                                "px-3 py-1 rounded-md transition",
                                                importSemester === 2 ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            2nd Sem
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={fetchSchoolEvents}
                                    disabled={isFetching}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isFetching ? 'Fetching...' : 'Fetch Events'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
                                <div
                                    className="flex items-center gap-3 cursor-pointer select-none"
                                    onClick={() => {
                                        if (selectedImportEvents.size === scrapedEvents.length) {
                                            setSelectedImportEvents(new Set());
                                        } else {
                                            setSelectedImportEvents(new Set(scrapedEvents.map((_, i) => i)));
                                        }
                                    }}
                                >
                                    <div className={cn(
                                        "w-5 h-5 border rounded flex items-center justify-center transition",
                                        selectedImportEvents.size === scrapedEvents.length && scrapedEvents.length > 0 ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"
                                    )}>
                                        {selectedImportEvents.size === scrapedEvents.length && scrapedEvents.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        Select All ({selectedImportEvents.size}/{scrapedEvents.length})
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2">
                                {scrapedEvents.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        {isFetching ? 'Loading...' : 'Select Year/Semester and Fetch.'}
                                    </div>
                                ) : (
                                    scrapedEvents.map((event, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                                                selectedImportEvents.has(idx) ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                                            )}
                                            onClick={() => toggleImportEvent(idx)}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 border rounded flex items-center justify-center transition",
                                                selectedImportEvents.has(idx) ? "bg-blue-500 border-blue-500" : "border-gray-300"
                                            )}>
                                                {selectedImportEvents.has(idx) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{event.content}</div>
                                                <div className="text-xs text-gray-500">
                                                    {event.date}
                                                    {event.endDate && ` ~ ${event.endDate}`}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button
                                    onClick={handleImport}
                                    disabled={selectedImportEvents.size === 0}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    Import {selectedImportEvents.size} Events
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
