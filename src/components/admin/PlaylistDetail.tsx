'use client';

import { useState, useEffect } from 'react';
import { addContentToPlaylist, removeContentFromPlaylist, updateContentZone, movePlaylistContent } from '@/app/admin/playlists/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Image as ImageIcon, Film, FileText } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
function SortableItem({ item, index, onRemove, onZoneChange }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-4">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab touch-none text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                </div>

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
                    onChange={(e) => onZoneChange(item.id, e.target.value)}
                    className="text-xs border rounded p-1"
                >
                    <option value="MAIN">Main Zone</option>
                    <option value="SUB">Sub Zone</option>
                </select>
                <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// Using relaxed types for MVP
export function PlaylistDetail({ playlist, allContents }: any) {
    const [selectedContentId, setSelectedContentId] = useState('');
    const [items, setItems] = useState(playlist.contents);

    // Sync items when prop changes (from server revalidate)
    useEffect(() => {
        setItems(playlist.contents);
    }, [playlist.contents]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setItems((items: any[]) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                return arrayMove(items, oldIndex, newIndex);
            });

            // Call server action after optimistic UI update
            // We need to calculate the index again or rely on the fact that we know the active/over IDs
            // However, since we need the *new index* to send to the server, let's calculate it here.
            // Note: 'items' in the closure above is stale or current? 
            // Better to calculate indices first.
            const oldIndex = items.findIndex((item: any) => item.id === active.id);
            const newIndex = items.findIndex((item: any) => item.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                movePlaylistContent(active.id as string, newIndex);
            }
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playlist Items / Sortable List */}
            <div className="lg:col-span-2 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sequence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {items.length === 0 && (
                            <p className="text-center text-gray-400 py-8">Playlist is empty. Add contents from the right.</p>
                        )}

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items}
                                strategy={verticalListSortingStrategy}
                            >
                                {items.map((item: any, index: number) => (
                                    <SortableItem
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        onRemove={removeContentFromPlaylist}
                                        onZoneChange={updateContentZone}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

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
