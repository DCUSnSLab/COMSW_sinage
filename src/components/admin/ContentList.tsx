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

    // YouTube Crawler State
    const [isCrawlOpen, setIsCrawlOpen] = useState(false);
    const [crawlUrl, setCrawlUrl] = useState('');
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawledVideos, setCrawledVideos] = useState<any[]>([]);
    const [savingVideoId, setSavingVideoId] = useState<string | null>(null);

    const router = useRouter();

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

    const handleCrawl = async () => {
        if (!crawlUrl) return;
        setIsCrawling(true);
        setCrawledVideos([]);
        try {
            const res = await fetch('/api/crawl/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelUrl: crawlUrl })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setCrawledVideos(data.videos || []);
        } catch (e) {
            alert('Failed to crawl: ' + (e as Error).message);
        } finally {
            setIsCrawling(false);
        }
    };

    const handleSaveExternal = async (video: any) => {
        setSavingVideoId(video.id);
        const formData = new FormData();
        formData.append('title', video.title);
        formData.append('type', 'VIDEO');
        formData.append('url', video.url);
        formData.append('body', video.title || '');
        formData.append('duration', '10'); // Default duration
        if (video.thumbnail) {
            formData.append('thumbnailUrl', video.thumbnail);
        }

        try {
            await createContent(formData);
            // Remove from list or mark done
            setCrawledVideos(prev => prev.filter(v => v.id !== video.id));
        } catch (e) {
            console.error(e);
            alert('Failed to save content');
        } finally {
            setSavingVideoId(null);
        }
    };


    // Auto-Crawl State
    const [isAutoCrawlOpen, setIsAutoCrawlOpen] = useState(false);
    const [crawlSettingsList, setCrawlSettingsList] = useState<any[]>([]);
    const [isSettingsLoading, setIsSettingsLoading] = useState(false);

    // New Channel Form State
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelUrl, setNewChannelUrl] = useState('');
    const [newChannelInterval, setNewChannelInterval] = useState(60);

    const loadCrawlSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const { getCrawlSettingsList } = await import('@/app/admin/contents/actions');
            const list = await getCrawlSettingsList();
            setCrawlSettingsList(list);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSettingsLoading(false);
        }
    };

    const handleOpenAutoCrawl = () => {
        setIsAutoCrawlOpen(true);
        loadCrawlSettings();
    };

    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSettingsLoading(true);
        try {
            const { addCrawlSetting } = await import('@/app/admin/contents/actions');
            await addCrawlSetting(newChannelName, newChannelUrl, newChannelInterval);
            await loadCrawlSettings();
            // Reset form
            setNewChannelName('');
            setNewChannelUrl('');
            setNewChannelInterval(60);
        } catch (e) {
            alert('Failed to add channel');
        } finally {
            setIsSettingsLoading(false);
        }
    };

    const handleToggleChannel = async (id: number, currentStatus: boolean) => {
        try {
            const { updateCrawlSetting } = await import('@/app/admin/contents/actions');
            await updateCrawlSetting(id, { isActive: !currentStatus });
            await loadCrawlSettings();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteChannel = async (id: number) => {
        if (!confirm('Are you sure you want to delete this channel?')) return;
        try {
            const { deleteCrawlSetting } = await import('@/app/admin/contents/actions');
            await deleteCrawlSetting(id);
            await loadCrawlSettings();
        } catch (e) {
            console.error(e);
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
                <div className="flex gap-2">
                    <button
                        onClick={handleOpenAutoCrawl}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        <Power className="w-4 h-4 mr-2" />
                        Auto Crawl
                    </button>
                    <button
                        onClick={() => setIsCrawlOpen(true)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        <Film className="w-4 h-4 mr-2" />
                        Crawl YouTube
                    </button>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Content
                    </button>
                </div>
            </div>

            {/* Auto Crawl Settings Modal */}
            {isAutoCrawlOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl bg-white max-h-[80vh] flex flex-col">
                        <CardHeader>
                            <CardTitle>Auto Crawl Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 overflow-hidden space-y-4">

                            {/* List of Channels */}
                            <div className="flex-1 overflow-y-auto border rounded-md p-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 bg-gray-50">
                                        <tr>
                                            <th className="p-2">Name</th>
                                            <th className="p-2">Channel URL</th>
                                            <th className="p-2">Interval</th>
                                            <th className="p-2">Status</th>
                                            <th className="p-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {crawlSettingsList.map(setting => (
                                            <tr key={setting.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-2 font-medium">{setting.name}</td>
                                                <td className="p-2 truncate max-w-[150px]" title={setting.channelUrl}>{setting.channelUrl}</td>
                                                <td className="p-2">{setting.checkInterval}m</td>
                                                <td className="p-2">
                                                    <button
                                                        onClick={() => handleToggleChannel(setting.id, setting.isActive)}
                                                        className={cn(
                                                            "px-2 py-1 rounded text-xs font-bold w-12",
                                                            setting.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                                                        )}
                                                    >
                                                        {setting.isActive ? 'ON' : 'OFF'}
                                                    </button>
                                                </td>
                                                <td className="p-2">
                                                    <button
                                                        onClick={() => handleDeleteChannel(setting.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {crawlSettingsList.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-gray-400">No channels configured.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add New Channel Form */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">Add New Channel</h4>
                                <form onSubmit={handleAddChannel} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                    <div>
                                        <label className="text-xs text-gray-500">Name</label>
                                        <input
                                            required
                                            className="w-full px-2 py-1 border rounded"
                                            value={newChannelName}
                                            onChange={e => setNewChannelName(e.target.value)}
                                            placeholder="e.g. Official Sizzle"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-gray-500">Channel URL</label>
                                        <input
                                            required
                                            className="w-full px-2 py-1 border rounded"
                                            value={newChannelUrl}
                                            onChange={e => setNewChannelUrl(e.target.value)}
                                            placeholder="https://youtube.com/@..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-20">
                                            <label className="text-xs text-gray-500">Interval(m)</label>
                                            <input
                                                type="number"
                                                required
                                                min={10}
                                                className="w-full px-2 py-1 border rounded"
                                                value={newChannelInterval}
                                                onChange={e => setNewChannelInterval(parseInt(e.target.value) || 60)}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSettingsLoading}
                                            className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm h-full"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button onClick={() => setIsAutoCrawlOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-md">Close</button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* YouTube Crawl Modal */}
            {isCrawlOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl bg-white max-h-[80vh] flex flex-col">
                        <CardHeader>
                            <CardTitle>YouTube Crawler (Keyword: 홍보)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 overflow-hidden space-y-4">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 border rounded-md"
                                    placeholder="Enter YouTube Channel URL (e.g. https://www.youtube.com/@ChannelName)"
                                    value={crawlUrl}
                                    onChange={e => setCrawlUrl(e.target.value)}
                                />
                                <button
                                    onClick={handleCrawl}
                                    disabled={isCrawling}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md whitespace-nowrap"
                                >
                                    {isCrawling ? 'Crawling...' : 'Search'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] border rounded-md p-2">
                                {crawledVideos.length === 0 && !isCrawling && (
                                    <div className="text-center text-gray-500 mt-10">
                                        Enter a channel URL to find videos with "홍보" in title/description.
                                    </div>
                                )}
                                {crawledVideos.map(video => (
                                    <div key={video.id} className="flex gap-4 p-2 border rounded-md hover:bg-gray-50">
                                        <div className="w-32 h-20 bg-black flex-shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{video.title}</div>
                                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(video.publishedAt).toLocaleDateString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleSaveExternal(video)}
                                            disabled={savingVideoId === video.id}
                                            className="self-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                        >
                                            {savingVideoId === video.id ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-2">
                                <button onClick={() => setIsCrawlOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-md">Close</button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                        <CardContent className="py-0 pb-3 text-xs text-gray-500 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span>{content.duration} sec</span>
                                <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {content.source && (
                                    <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm font-medium truncate max-w-[100px]" title={content.source}>
                                        {content.source}
                                    </span>
                                )}
                                {(content as any).playlists?.map((p: any) => (
                                    <span key={p.playlistId} className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-sm font-medium truncate max-w-[100px]">
                                        {p.playlist.name}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
