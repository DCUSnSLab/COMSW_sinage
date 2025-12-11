'use client';

import { useState, useRef } from 'react';
import { Content } from '@prisma/client';
import { createContent, deleteContent, toggleContentStatus, updateContent } from '@/app/admin/contents/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image as ImageIcon, Film, Plus, Trash2, Power, Edit, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function ContentList({ initialContents }: { initialContents: Content[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [selectedType, setSelectedType] = useState('IMAGE'); // IMAGE, VIDEO, TEXT
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to generate video thumbnail
    const generateThumbnail = async (file: File): Promise<File | null> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.currentTime = 1; // Seek to 1s

            video.onloadeddata = () => {
                // Wait a bit for seek
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const thumbFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                            resolve(thumbFile);
                        } else {
                            resolve(null);
                        }
                        URL.revokeObjectURL(video.src);
                    }, 'image/jpeg', 0.7);
                }, 500);
            };

            video.onerror = () => {
                resolve(null);
            };
        });
    };

    const handleCreateSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            // If video, try generate thumbnail
            const type = formData.get('type');
            if (type === 'VIDEO') {
                const file = formData.get('file') as File;
                if (file && file.size > 0) {
                    const thumb = await generateThumbnail(file);
                    if (thumb) {
                        formData.append('thumbnail', thumb);
                    }
                }
            }
            await createContent(formData);
            setIsFormOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateSubmit = async (formData: FormData) => {
        if (!editingContent) return;
        setIsSubmitting(true);
        try {
            await updateContent(editingContent.id, formData);
            setEditingContent(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter contents
    const filteredContents = initialContents.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="pl-9 pr-4 py-2 border rounded-lg w-full"
                        placeholder="Search content..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Content
                </button>
            </div>

            {/* Create Form */}
            {isFormOpen && (
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle>Upload New Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium">Content Title</label>
                                <input name="title" required className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Graduation Exhibition Poster" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Content Type</label>
                                <select
                                    name="type"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="IMAGE">Image</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="TEXT">Text Notice</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Duration (Seconds)</label>
                                <input name="duration" type="number" defaultValue={10} className="w-full px-3 py-2 border rounded-md" />
                            </div>

                            <div className="md:col-span-2 border-t pt-4 space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Message / Description</label>
                                    <textarea name="body" rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="Enter caption or notice text..." />
                                </div>

                                {selectedType !== 'TEXT' && (
                                    <div>
                                        <label className="text-sm font-medium">File Upload</label>
                                        <input type="file" name="file" accept={selectedType === 'IMAGE' ? "image/*" : "video/*"} className="w-full bg-white px-3 py-2 border rounded-md" />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                                    {isSubmitting ? 'Uploading...' : 'Save Content'}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Edit Modal / Form Overlay */}
            {editingContent && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg bg-white">
                        <CardHeader>
                            <CardTitle>Edit Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={handleUpdateSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Content Title</label>
                                    <input name="title" defaultValue={editingContent.title} required className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Message / Description</label>
                                    <textarea name="body" defaultValue={editingContent.body || ''} rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="Enter caption or notice text..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Duration (Sec)</label>
                                        <input name="duration" type="number" defaultValue={editingContent.duration} className="w-full px-3 py-2 border rounded-md" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Start Date</label>
                                        <input
                                            name="startDate"
                                            type="datetime-local"
                                            defaultValue={editingContent.startDate ? new Date(editingContent.startDate).toISOString().slice(0, 16) : ''}
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">End Date</label>
                                        <input
                                            name="endDate"
                                            type="datetime-local"
                                            defaultValue={editingContent.endDate ? new Date(editingContent.endDate).toISOString().slice(0, 16) : ''}
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button type="button" onClick={() => setEditingContent(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-md">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                                        {isSubmitting ? 'Saving...' : 'Update'}
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredContents.map((content) => (
                    <Card key={content.id} className={cn("overflow-hidden group transition-all hover:shadow-lg", !content.isActive && "opacity-60")}>
                        <div className="aspect-video bg-gray-100 relative items-center justify-center flex overflow-hidden">
                            {content.type === 'IMAGE' && content.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={content.url} alt={content.title} className="w-full h-full object-cover" />
                            ) : content.type === 'VIDEO' ? (
                                content.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <Film className="w-12 h-12 mb-2" />
                                        <span className="text-xs">Video Content</span>
                                    </div>
                                )
                            ) : (
                                <div className="p-4 text-center text-sm">
                                    {content.body?.substring(0, 100)}...
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => toggleContentStatus(content.id, !content.isActive)}
                                    className="p-2 bg-white rounded-full hover:scale-110 transition" title="Toggle Active"
                                >
                                    <Power className={cn("w-4 h-4", content.isActive ? "text-green-600" : "text-gray-400")} />
                                </button>
                                <button
                                    onClick={() => setEditingContent(content)}
                                    className="p-2 bg-white rounded-full hover:scale-110 transition text-blue-500" title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteContent(content.id)}
                                    className="p-2 bg-white rounded-full hover:scale-110 transition text-red-500" title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <CardHeader className="py-3">
                            <CardTitle className="text-base font-medium truncate flex items-center">
                                {content.type === 'IMAGE' && <ImageIcon className="w-4 h-4 mr-2 text-blue-500" />}
                                {content.type === 'VIDEO' && <Film className="w-4 h-4 mr-2 text-purple-500" />}
                                {content.type === 'TEXT' && <FileText className="w-4 h-4 mr-2 text-orange-500" />}
                                {content.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0 pb-3 text-xs text-gray-500 flex justify-between">
                            <span>{content.duration} sec</span>
                            <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
