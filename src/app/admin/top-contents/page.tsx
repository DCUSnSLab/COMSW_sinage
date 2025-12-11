'use client';

import { useState, useEffect } from 'react';
import { createSchedule, deleteSchedule, getMonthSchedules } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function TopContentsPage() {
    const [date, setDate] = useState(new Date());
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const router = useRouter();

    const fetchSchedules = async () => {
        const data = await getMonthSchedules(date.getFullYear(), date.getMonth());
        setSchedules(data);
    };

    useEffect(() => {
        fetchSchedules();
    }, [date]);

    // Calendar logic
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(date.getFullYear(), date.getMonth(), day);
        setSelectedDate(clickedDate);
        setIsModalOpen(true);
    };

    const handleCreate = async (formData: FormData) => {
        await createSchedule(formData);
        setIsModalOpen(false);
        fetchSchedules();
    };

    const handleDelete = async (id: string) => {
        await deleteSchedule(id);
        fetchSchedules();
    };

    const renderCalendar = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 border border-transparent rounded-lg" />);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDaySchedules = schedules.filter(s => new Date(s.date).getDate() === day);
            const isToday = new Date().toDateString() === new Date(date.getFullYear(), date.getMonth(), day).toDateString();

            days.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                        "h-24 border rounded-lg p-2 cursor-pointer transition hover:bg-blue-50 relative overflow-hidden",
                        isToday ? "border-blue-500 bg-blue-50/30" : "border-gray-200 bg-white"
                    )}
                >
                    <span className={cn("text-sm font-medium block mb-1", isToday ? "text-blue-600" : "text-gray-700")}>
                        {day}
                    </span>
                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-24px)]">
                        {currentDaySchedules.map(s => (
                            <div key={s.id} className="text-xs bg-blue-100 text-blue-800 px-1 rounded truncate">
                                {s.content}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Top Content Management</h1>

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
                            <div className="grid grid-cols-7 gap-4 mb-2 text-center text-sm font-medium text-gray-500">
                                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                            </div>
                            <div className="grid grid-cols-7 gap-4">
                                {renderCalendar()}
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

            {/* Add Schedule Modal */}
            {isModalOpen && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md bg-white animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle>Manage Schedules - {selectedDate.toLocaleDateString()}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* List existing for date */}
                            {schedules.filter(s => new Date(s.date).toDateString() === selectedDate.toDateString()).map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                    <span>{s.content}</span>
                                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <form action={handleCreate} className="flex gap-2 pt-4 border-t">
                                <input type="hidden" name="date" value={selectedDate.toISOString()} />
                                <input name="content" required placeholder="New schedule..." className="flex-1 px-3 py-2 border rounded-md" />
                                <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
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
        </div>
    );
}
