'use client';

import { useState } from 'react';
import { Notice } from '@prisma/client';
import { createNotice, deleteNotice, toggleNoticeStatus } from '@/app/admin/notices/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Plus, Trash2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NoticeList({ initialNotices }: { initialNotices: Notice[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Notice
                </button>
            </div>

            {isFormOpen && (
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle>Broadcast New Notice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            await createNotice(formData);
                            setIsFormOpen(false);
                        }} className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <input name="message" required className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Welcome to the Open House Event!" />
                            </div>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
                                Save
                            </button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {initialNotices.map((notice) => (
                    <Card key={notice.id} className={cn("transition-all flex flex-row items-center", !notice.isActive && "opacity-60 bg-gray-50")}>
                        <div className="p-4 flex items-center justify-center bg-gray-100 h-full border-r">
                            <MessageSquare className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1 p-4">
                            <p className="font-medium text-lg">{notice.message}</p>
                            <span className="text-xs text-gray-400">{new Date(notice.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="p-4 flex gap-2">
                            <button
                                onClick={() => toggleNoticeStatus(notice.id, !notice.isActive)}
                                className={cn("p-2 rounded-full", notice.isActive ? "text-green-600 bg-green-100" : "text-gray-400 bg-gray-200")}
                                title="Toggle Status"
                            >
                                <Power className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => deleteNotice(notice.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </Card>
                ))}

                {initialNotices.length === 0 && !isFormOpen && (
                    <div className="py-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No notices broadcasting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
