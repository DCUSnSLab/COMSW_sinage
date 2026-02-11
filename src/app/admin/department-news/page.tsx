'use client';

import { useState, useEffect } from 'react';
import { getStoredNewsList, forceCrawl, importNewsContent, getNewsSettings, updateNewsSettings, getNewsDetail } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, RefreshCw, FileText, ImageIcon, ExternalLink, Download, Check, Settings, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function DepartmentNewsPage() {
    const [newsList, setNewsList] = useState<any[]>([]);
    const [isFetchingNews, setIsFetchingNews] = useState(false);
    const [importNewsUrl, setImportNewsUrl] = useState<string | null>(null);
    const [importNewsType, setImportNewsType] = useState<'TEXT' | 'IMAGE'>('TEXT');
    const [isImportingNews, setIsImportingNews] = useState(false);

    // Settings State
    const [isAutoCrawl, setIsAutoCrawl] = useState(false);
    const [checkInterval, setCheckInterval] = useState(60);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Fetch full detail when a news item is selected
    useEffect(() => {
        const fetchDetail = async () => {
            if (selectedNews && !selectedNews.content) {
                setIsLoadingDetail(true);
                try {
                    const detail = await getNewsDetail(selectedNews.id);
                    if (detail) {
                        setSelectedNews(detail);
                        // Update the list as well to reflect the change locally
                        setNewsList(prev => prev.map(item => item.id === detail.id ? detail : item));
                    }
                } catch (e) {
                    console.error("Failed to fetch detail", e);
                } finally {
                    setIsLoadingDetail(false);
                }
            }
        };

        if (selectedNews) {
            fetchDetail();
        }
    }, [selectedNews?.id]); // Depend on ID to trigger only on change


    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [news, settings] = await Promise.all([
            getStoredNewsList(),
            getNewsSettings()
        ]);
        setNewsList(news);
        if (settings) {
            setIsAutoCrawl(settings.isActive);
            setCheckInterval(settings.checkInterval);
        }
    };

    const handleForceCrawl = async () => {
        setIsFetchingNews(true);
        await forceCrawl();
        const news = await getStoredNewsList();
        setNewsList(news);
        setIsFetchingNews(false);
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        await updateNewsSettings(isAutoCrawl, checkInterval);
        setIsSavingSettings(false);
        alert('설정이 완료되었습니다.');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Department News</h1>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition",
                        showSettings ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    )}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
            </div>

            {/* Settings Card */}
            {showSettings && (
                <Card className="bg-gray-50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-lg">Crawler Configuration</CardTitle>
                        <CardDescription>Configure how often the Department News crawler runs automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4">
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={cn(
                                        "w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out",
                                        isAutoCrawl ? "bg-blue-600" : "bg-gray-300"
                                    )}>
                                        <div className={cn(
                                            "w-4 h-4 bg-white rounded-full shadow-sm transform transition duration-200 ease-in-out",
                                            isAutoCrawl ? "translate-x-4" : "translate-x-0"
                                        )} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={isAutoCrawl}
                                        onChange={(e) => setIsAutoCrawl(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Auto-Crawl Enabled</span>
                                </label>
                            </div>

                            <div className="flex-1 max-w-xs">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check Interval (Minutes)</label>
                                <input
                                    type="number"
                                    min="10"
                                    value={checkInterval}
                                    onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            News Feed
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {isAutoCrawl
                                ? `Auto-crawling every ${checkInterval} minutes.`
                                : "Auto-crawl is disabled."}
                        </CardDescription>
                    </div>
                    <button
                        onClick={handleForceCrawl}
                        disabled={isFetchingNews}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", isFetchingNews && "animate-spin")} />
                        {isFetchingNews ? 'Crawling...' : 'Refresh Now'}
                    </button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {newsList.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                No news found. Click 'Refresh Now' to start the first crawl.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {newsList.map((news) => (
                                    <div key={news.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition">
                                        <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => setSelectedNews(news)}>
                                            <div className="font-medium truncate hover:text-blue-600" title={news.title}>
                                                {news.title}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-xs border">
                                                        {news.date}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Crawled {formatDistanceToNow(new Date(news.crawledAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {news.isImported && (
                                                <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">
                                                    <Check className="w-3 h-3" />
                                                    Imported
                                                </span>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedNews(news);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                                            >
                                                <FileText className="w-3 h-3" />
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Import News Modal */}
            {importNewsUrl && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-lg font-bold mb-4">Import News Content</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Import Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setImportNewsType('TEXT')}
                                        className={cn(
                                            "flex-1 py-2 px-4 rounded border flex items-center justify-center gap-2",
                                            importNewsType === 'TEXT' ? "bg-blue-50 border-blue-500 text-blue-700" : "hover:bg-gray-50"
                                        )}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Text
                                    </button>
                                    <button
                                        onClick={() => setImportNewsType('IMAGE')}
                                        className={cn(
                                            "flex-1 py-2 px-4 rounded border flex items-center justify-center gap-2",
                                            importNewsType === 'IMAGE' ? "bg-blue-50 border-blue-500 text-blue-700" : "hover:bg-gray-50"
                                        )}
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Image (First)
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {importNewsType === 'TEXT'
                                        ? "Imports title and body text."
                                        : "Imports the first image found in the post content."}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setImportNewsUrl(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!importNewsUrl) return;
                                    setIsImportingNews(true);
                                    const res = await importNewsContent(importNewsUrl, importNewsType);
                                    setIsImportingNews(false);
                                    if (res.success) {
                                        setImportNewsUrl(null);
                                        // Update local state to show 'Imported' badge immediately without reload
                                        setNewsList(prev => prev.map(n => n.link === importNewsUrl ? { ...n, isImported: true } : n));
                                        alert('Successfully imported!');
                                    } else {
                                        alert('Failed to import: ' + res.error);
                                    }
                                }}
                                disabled={isImportingNews}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isImportingNews ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Detail Modal */}
            {selectedNews && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold leading-tight mr-4">{selectedNews.title}</h2>
                                <div className="text-sm text-gray-500 mt-1 flex gap-2">
                                    <span>{selectedNews.date}</span>
                                    <span>|</span>
                                    <a href={selectedNews.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                        View Original <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedNews(null)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Images Gallery */}
                            {selectedNews.images && selectedNews.images.length > 0 && (
                                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {selectedNews.images.map((img: string, i: number) => (
                                        <div key={i} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img} alt={`Attachment ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* HTML Content */}
                            <div className="prose max-w-none prose-sm md:prose-base bg-gray-50 p-6 rounded-lg border">
                                {isLoadingDetail ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                                        <RefreshCw className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                                        <p>Fetching content...</p>
                                    </div>
                                ) : selectedNews.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedNews.content }} />
                                ) : (
                                    <p className="text-gray-400 italic text-center">No content text available.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setImportNewsUrl(selectedNews.link);
                                    setImportNewsType('TEXT');
                                    // Keep detail modal open or close it? Let's keep it open or maybe close it to show import modal clearly.
                                    // Actually, Import Modal is a separate overlay. It will stack.
                                }}
                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Import This Content
                            </button>
                            <button
                                onClick={() => setSelectedNews(null)}
                                className="px-4 py-2 border bg-white rounded-lg hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
