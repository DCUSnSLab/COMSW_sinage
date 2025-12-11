'use client';

import { useState } from 'react';
import { createPlaylist, deletePlaylist } from '@/app/admin/playlists/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus, Trash2, ListMusic } from 'lucide-react';
import Link from 'next/link';

// Helper type since we included _count
type PlaylistWithCounts = {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        contents: number;
        devices: number;
    }
};

export function PlaylistList({ initialPlaylists }: { initialPlaylists: PlaylistWithCounts[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                </button>
            </div>

            {isFormOpen && (
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle>New Playlist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            await createPlaylist(formData);
                            setIsFormOpen(false);
                        }} className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input name="name" required className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Morning Loop" />
                            </div>
                            <div className="flex-[2] space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <input name="description" className="w-full px-3 py-2 border rounded-md" placeholder="Optional description" />
                            </div>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
                                Create
                            </button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialPlaylists.map((playlist) => (
                    <Card key={playlist.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium flex items-center">
                                <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                                {playlist.name}
                            </CardTitle>
                            <button
                                onClick={() => deletePlaylist(playlist.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">
                                {playlist.description || "No description"}
                            </p>

                            <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-3">
                                <div className="flex gap-4">
                                    <span>{playlist._count.contents} Contents</span>
                                    <span>{playlist._count.devices} Devices</span>
                                </div>
                                <Link
                                    href={`/admin/playlists/${playlist.id}`}
                                    className="text-blue-600 hover:underline flex items-center"
                                >
                                    <ListMusic className="w-3 h-3 mr-1" />
                                    Manage Items
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
