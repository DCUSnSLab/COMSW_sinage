'use client';

import { useState } from 'react';
import { createPlaylist, deletePlaylist, updatePlaylist } from '@/app/admin/playlists/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus, Trash2, ListMusic, Edit, X, Save } from 'lucide-react';
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
    const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithCounts | null>(null);

    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const startEditing = (playlist: PlaylistWithCounts) => {
        setEditingPlaylist(playlist);
        setEditName(playlist.name);
        setEditDescription(playlist.description || '');
        setIsFormOpen(false); // Close create form if open
    };

    const cancelEditing = () => {
        setEditingPlaylist(null);
        setEditName('');
        setEditDescription('');
    };

    const handleUpdate = async () => {
        if (!editingPlaylist) return;
        try {
            await updatePlaylist(editingPlaylist.id, editName, editDescription);
            cancelEditing();
        } catch (e) {
            console.error("Failed to update playlist", e);
            alert("Failed to update playlist");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {!editingPlaylist && (
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Playlist
                    </button>
                )}
            </div>

            {/* Create Form */}
            {isFormOpen && !editingPlaylist && (
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

            {/* Edit Form */}
            {editingPlaylist && (
                <Card className="border-orange-100 bg-orange-50/50 border-2">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Edit Playlist: {editingPlaylist.name}</span>
                            <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>
                            <div className="flex-[2] space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>
                            <button
                                onClick={handleUpdate}
                                disabled={!editName}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialPlaylists.map((playlist) => (
                    <Card key={playlist.id} className={editingPlaylist?.id === playlist.id ? "ring-2 ring-orange-400 opacity-50" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium flex items-center">
                                <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                                {playlist.name}
                            </CardTitle>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => startEditing(playlist)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`'${playlist.name}' 플레이리스트를 정말 삭제하시겠습니까?`)) {
                                            deletePlaylist(playlist.id);
                                        }
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
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
