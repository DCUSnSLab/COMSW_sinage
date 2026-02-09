'use client';

import { useState, useRef, useEffect } from 'react';
import { Content } from '@prisma/client';
import { createContent, deleteContent, toggleContentStatus, updateContent } from '@/app/admin/contents/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image as ImageIcon, Film, Plus, Trash2, Power, Edit, Search, LayoutGrid, List, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function ContentList({ initialContents }: { initialContents: Content[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [selectedType, setSelectedType] = useState('IMAGE'); // IMAGE, VIDEO, TEXT
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterType, setFilterType] = useState('ALL');
    const [filterPlaylist, setFilterPlaylist] = useState('ALL');
    const [sortOrder, setSortOrder] = useState('NEWEST');
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Extract unique playlists from contents
    const allPlaylists = Array.from(new Map(
        initialContents.flatMap(c => (c as any).playlists || []).map((p: any) => [p.playlist.id, p.playlist])
    ).values());

    // Filter and Sort Logic
    const filteredContents = initialContents
        .filter(content => {
            const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'ALL' || content.type === filterType;
            const matchesPlaylist = filterPlaylist === 'ALL' || ((content as any).playlists || []).some((p: any) => p.playlist.id === filterPlaylist);
            return matchesSearch && matchesType && matchesPlaylist;
        })
        .sort((a, b) => {
            switch (sortOrder) {
                case 'NEWEST': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'OLDEST': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'NAME_ASC': return a.title.localeCompare(b.title);
                case 'NAME_DESC': return b.title.localeCompare(a.title);
                default: return 0;
            }
        });

    const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
    const paginatedContents = filteredContents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on filter change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // ... existing handlers ...
    const [isCrawlOpen, setIsCrawlOpen] = useState(false);
    const [crawlUrl, setCrawlUrl] = useState('');
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawledVideos, setCrawledVideos] = useState<any[]>([]);
    const [savingVideoIds, setSavingVideoIds] = useState<string[]>([]);
    const [savingVideoId, setSavingVideoId] = useState<string | null>(null); // Keep for compatibility if needed, using array now

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
        setSavingVideoIds(prev => [...prev, video.id]);
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
            setSavingVideoIds(prev => prev.filter(id => id !== video.id));
        }
    };




    // Auto-Crawl State
    const [isAutoCrawlOpen, setIsAutoCrawlOpen] = useState(false);
    const [crawlSettingsList, setCrawlSettingsList] = useState<any[]>([]);
    const [isSettingsLoading, setIsSettingsLoading] = useState(false);
    const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
    const [editChannelName, setEditChannelName] = useState('');
    const [editChannelUrl, setEditChannelUrl] = useState('');
    const [editChannelInterval, setEditChannelInterval] = useState(60);

    const [availablePlaylists, setAvailablePlaylists] = useState<any[]>([]);

    // New Channel Form State
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelUrl, setNewChannelUrl] = useState('');
    const [newChannelInterval, setNewChannelInterval] = useState(60);
    const [newChannelPlaylistId, setNewChannelPlaylistId] = useState(''); // Empty string for "None"

    const [editChannelPlaylistId, setEditChannelPlaylistId] = useState('');

    useEffect(() => {
        if (isAutoCrawlOpen) {
            loadCrawlSettings();
            loadPlaylists();
        }
    }, [isAutoCrawlOpen]);

    const loadPlaylists = async () => {
        try {
            const { getPlaylists } = await import('@/app/admin/contents/actions');
            const data = await getPlaylists();
            setAvailablePlaylists(data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadCrawlSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const { getCrawlSettingsList } = await import('@/app/admin/contents/actions');
            const data = await getCrawlSettingsList();
            setCrawlSettingsList(data);
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

    const handleSaveChannel = async () => {
        if (!newChannelName || !newChannelUrl) return;
        try {
            const { addCrawlSetting } = await import('@/app/admin/contents/actions');
            await addCrawlSetting(newChannelName, newChannelUrl, newChannelInterval, newChannelPlaylistId || undefined);
            setNewChannelName('');
            setNewChannelUrl('');
            setNewChannelInterval(60);
            setNewChannelPlaylistId('');
            await loadCrawlSettings();
        } catch (e) {
            console.error(e);
            alert('Failed to add channel');
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

    const startEditingChannel = (setting: any) => {
        setEditingChannelId(setting.id);
        setEditChannelName(setting.name);
        setEditChannelUrl(setting.channelUrl);
        setEditChannelInterval(setting.checkInterval);
        setEditChannelPlaylistId(setting.playlistId || '');
    };

    const saveEditingChannel = async () => {
        if (!editingChannelId) return;
        try {
            const { updateCrawlSetting } = await import('@/app/admin/contents/actions');
            await updateCrawlSetting(editingChannelId, {
                name: editChannelName,
                channelUrl: editChannelUrl,
                checkInterval: editChannelInterval,
                playlistId: editChannelPlaylistId || null
            });
            await loadCrawlSettings();
            setEditingChannelId(null);
        } catch (e) {
            console.error(e);
            alert('Failed to update channel');
        }
    };

    const handleDeleteContent = async (id: string) => {
        if (confirm('Are you sure you want to delete this content?')) {
            await deleteContent(id);
        }
    };




    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative w-full xl:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        placeholder="Search contents..."
                        className="pl-8 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="ALL">All Types</option>
                        <option value="VIDEO">Video</option>
                        <option value="IMAGE">Image</option>
                    </select>

                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white max-w-[150px]"
                        value={filterPlaylist}
                        onChange={(e) => { setFilterPlaylist(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="ALL">All Playlists</option>
                        {allPlaylists.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
                        value={sortOrder}
                        onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="NEWEST">Newest</option>
                        <option value="OLDEST">Oldest</option>
                        <option value="NAME_ASC">Name (A-Z)</option>
                        <option value="NAME_DESC">Name (Z-A)</option>
                    </select>

                    <div className="h-6 w-px bg-gray-300 mx-1 hidden xl:block"></div>

                    <div className="flex bg-gray-100 p-1 rounded-md mr-2">
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={cn("p-1.5 rounded-sm transition-all", viewMode === 'GRID' ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600")}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={cn("p-1.5 rounded-sm transition-all", viewMode === 'LIST' ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600")}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                    <button
                        onClick={handleOpenAutoCrawl}
                        className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm whitespace-nowrap"
                    >
                        <Power className="w-4 h-4" /> Auto Crawl
                    </button>
                    <button
                        onClick={() => setIsCrawlOpen(true)}
                        className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm whitespace-nowrap"
                    >
                        <Film className="w-4 h-4" /> Crawl Youtube
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
                                            <th className="p-3 w-1/4">Name</th>
                                            <th className="p-3">Channel URL</th>
                                            <th className="p-3 w-32">Playlist</th>
                                            <th className="p-3 w-24">Interval (min)</th>
                                            <th className="p-3 w-20">Active</th>
                                            <th className="p-3 w-16">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Add New Row */}
                                        <tr className="bg-blue-50/50 border-b">
                                            <td className="p-2">
                                                <input
                                                    placeholder="Channel Name"
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                    value={newChannelName}
                                                    onChange={e => setNewChannelName(e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    placeholder="Channel / RSS URL"
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                    value={newChannelUrl}
                                                    onChange={e => setNewChannelUrl(e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    className="w-full px-2 py-1 border rounded text-sm max-w-[120px]"
                                                    value={newChannelPlaylistId}
                                                    onChange={e => setNewChannelPlaylistId(e.target.value)}
                                                >
                                                    <option value="">No Playlist</option>
                                                    {availablePlaylists.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min={10}
                                                    className="w-20 px-2 py-1 border rounded text-sm"
                                                    value={newChannelInterval}
                                                    onChange={e => setNewChannelInterval(parseInt(e.target.value) || 60)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <button
                                                    onClick={handleSaveChannel}
                                                    disabled={!newChannelName || !newChannelUrl}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                                                >
                                                    Add
                                                </button>
                                            </td>
                                            <td className="p-2"></td>
                                        </tr>
                                        {crawlSettingsList.map(setting => (
                                            <tr key={setting.id} className="border-b last:border-0 hover:bg-gray-50">
                                                {editingChannelId === setting.id ? (
                                                    <>
                                                        <td className="p-2">
                                                            <input
                                                                className="w-full px-2 py-1 border rounded text-sm"
                                                                value={editChannelName}
                                                                onChange={e => setEditChannelName(e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                className="w-full px-2 py-1 border rounded text-sm"
                                                                value={editChannelUrl}
                                                                onChange={e => setEditChannelUrl(e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <select
                                                                className="w-full px-2 py-1 border rounded text-sm max-w-[120px]"
                                                                value={editChannelPlaylistId}
                                                                onChange={e => setEditChannelPlaylistId(e.target.value)}
                                                            >
                                                                <option value="">No Playlist</option>
                                                                {availablePlaylists.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                min={10}
                                                                className="w-20 px-2 py-1 border rounded text-sm"
                                                                value={editChannelInterval}
                                                                onChange={e => setEditChannelInterval(parseInt(e.target.value) || 60)}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <span className="text-xs text-gray-400">Editing...</span>
                                                        </td>
                                                        <td className="p-2 flex gap-1">
                                                            <button onClick={saveEditingChannel} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditingChannelId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancel">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-2 font-medium">{setting.name}</td>
                                                        <td className="p-2 truncate max-w-[150px]" title={setting.channelUrl}>{setting.channelUrl}</td>
                                                        <td className="p-2 text-sm text-gray-600">
                                                            {setting.playlist ? setting.playlist.name : '-'}
                                                        </td>
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
                                                        <td className="p-2 flex gap-1">
                                                            <button
                                                                onClick={() => startEditingChannel(setting)}
                                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteChannel(setting.id)}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
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
                                            disabled={savingVideoIds.includes(video.id)}
                                            className="self-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {savingVideoIds.includes(video.id) ? 'Adding...' : 'Add'}
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

            {viewMode === 'LIST' ? (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3 w-16">Preview</th>
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3 w-24">Type</th>
                                <th className="px-4 py-3 w-32">Duration</th>
                                <th className="px-4 py-3 w-32">Date</th>
                                <th className="px-4 py-3 w-24 text-center">Active</th>
                                <th className="px-4 py-3 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {paginatedContents.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No contents found matching your filters.</td></tr>
                            ) : (
                                paginatedContents.map(content => (
                                    <tr key={content.id} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-2">
                                            <div className="w-12 h-8 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                {content.type === 'IMAGE' && content.url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={content.url} alt="" className="w-full h-full object-cover" />
                                                ) : content.type === 'VIDEO' && content.thumbnail ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={content.thumbnail} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-medium truncate max-w-[200px] xl:max-w-[400px]" title={content.title}>{content.title}</div>
                                            <div className="flex gap-1 mt-1">
                                                {(content as any).source && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm truncate max-w-[100px]" title={(content as any).source}>
                                                        {(content as any).source}
                                                    </span>
                                                )}
                                                {(content as any).playlists?.map((p: any) => (
                                                    <span key={p.playlistId} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-sm truncate max-w-[100px]">
                                                        {p.playlist.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                content.type === 'VIDEO' ? "bg-purple-100 text-purple-700" :
                                                    content.type === 'IMAGE' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {content.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">{content.duration}s</td>
                                        <td className="px-4 py-2 text-gray-500">{new Date(content.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => toggleContentStatus(content.id, !content.isActive)}
                                                className={cn("p-1.5 rounded-full transition-colors", content.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingContent(content)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContent(content.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedContents.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No contents found matching your filters.
                        </div>
                    ) : (
                        paginatedContents.map((content) => (
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
                                            onClick={() => handleDeleteContent(content.id)}
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
                                        {(content as any).source && (
                                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm font-medium truncate max-w-[100px]" title={(content as any).source}>
                                                {(content as any).source}
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
                        ))
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
