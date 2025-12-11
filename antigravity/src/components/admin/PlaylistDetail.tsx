'use client';

import { useState } from 'react';
import { addContentToPlaylist, removeContentFromPlaylist, updateContentZone } from '@/app/admin/playlists/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Image as ImageIcon, Film, FileText } from 'lucide-react';

// Using relaxed types for MVP
export function PlaylistDetail({ playlist, allContents }: any) {
    const [selectedContentId, setSelectedContentId] = useState('');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playlist Items */}
            <div className="lg:col-span-2 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sequence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {playlist.contents.length === 0 && (
                            <p className="text-center text-gray-400 py-8">Playlist is empty. Add contents from the right.</p>
                        )}
                        {playlist.contents.map((item: any, index: number) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-bold shrink-0">
                                        {index + 1}
                                    </span>

                                    {/* Thumbnail Preview */}
                                    <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex items-center justify-center shrink-0">
                                        {item.content.type === 'IMAGE' && item.content.url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.content.url} alt="" className="w-full h-full object-cover" />
                                        ) : item.content.type === 'VIDEO' ? (
                                            item.content.thumbnail ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.content.thumbnail} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Film className="w-6 h-6 text-gray-500" />
                                            )
                                        ) : (
                                            <FileText className="w-6 h-6 text-gray-500" />
                                        )}
                                    </div>

                                    <div>
                                        <p className="font-medium">{item.content.title}</p>
                                        <p className="text-xs text-gray-500">{item.content.type} • {item.content.duration}s</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={item.zone}
                                        onChange={(e) => updateContentZone(item.id, e.target.value)}
                                        className="text-xs border rounded p-1"
                                    >
                                        <option value="MAIN">Main Zone</option>
                                        <option value="SUB">Sub Zone</option>
                                    </select>
                                    <button onClick={() => removeContentFromPlaylist(item.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Item Selector */}
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Available Contents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <select
                                className="w-full border rounded-md px-3 py-2"
                                value={selectedContentId}
                                onChange={(e) => setSelectedContentId(e.target.value)}
                            >
                                <option value="">Select Content...</option>
                                {allContents.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.title} ({c.type})</option>
                                ))}
                            </select>
                            <button
                                disabled={!selectedContentId}
                                onClick={() => {
                                    addContentToPlaylist(playlist.id, selectedContentId);
                                    setSelectedContentId('');
                                }}
                                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Add to Playlist
                            </button>
                        </div>

                        <div className="mt-8 text-xs text-gray-400">
                            <p>Note: In Split Layout mode</p>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li>Main Zone: Top or Left</li>
                                <li>Sub Zone: Bottom or Right</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
