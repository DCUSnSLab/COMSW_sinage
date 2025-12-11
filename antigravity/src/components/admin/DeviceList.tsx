'use client';

import { useState, useEffect } from 'react';
import { Device, Playlist } from '@prisma/client';
import { createDevice, deleteDevice, toggleDeviceStatus, updateDevice } from '@/app/admin/devices/actions';
import { assignDeviceToPlaylist } from '@/app/admin/playlists/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Plus, Trash2, Power, LayoutTemplate, Link as LinkIcon, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function DeviceList({ initialDevices, playlists }: { initialDevices: any[], playlists: Playlist[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any | null>(null);
    const router = useRouter();

    // Ratio State for Form
    const [mainRatio, setMainRatio] = useState(50);
    const [subRatio, setSubRatio] = useState(50);

    // Sync sub ratio when main changes
    const handleMainRatioChange = (val: number) => {
        const v = Math.min(Math.max(val, 20), 80);
        setMainRatio(v);
        setSubRatio(100 - v);
    };

    // Sync main ratio when sub changes
    const handleSubRatioChange = (val: number) => {
        const v = Math.min(Math.max(val, 20), 80);
        setSubRatio(v);
        setMainRatio(100 - v);
    };

    const handlePlaylistChange = async (deviceId: string, playlistId: string) => {
        await assignDeviceToPlaylist(deviceId, playlistId);
        router.refresh();
    };

    const openEdit = (device: any) => {
        setEditingDevice(device);
        setMainRatio(device.splitRatio || 50);
        setSubRatio(100 - (device.splitRatio || 50));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => { setIsFormOpen(!isFormOpen); setEditingDevice(null); setMainRatio(50); setSubRatio(50); }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Device
                </button>
            </div>

            {/* Create/Edit Form */}
            {(isFormOpen || editingDevice) && (
                <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50", !editingDevice && !isFormOpen && "hidden")}>
                    <Card className="w-full max-w-2xl bg-white">
                        <CardHeader>
                            <CardTitle>{editingDevice ? 'Edit Device' : 'Register New Device'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={async (formData) => {
                                formData.set('splitRatio', mainRatio.toString());
                                if (editingDevice) {
                                    await updateDevice(editingDevice.id, formData);
                                    setEditingDevice(null);
                                } else {
                                    await createDevice(formData);
                                    setIsFormOpen(false);
                                }
                            }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Device Name</label>
                                    <input name="name" defaultValue={editingDevice?.name} required className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Lobby Monitor 1" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Location</label>
                                    <input name="location" defaultValue={editingDevice?.location} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. 1st Floor" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Layout Mode</label>
                                    <select name="layoutMode" defaultValue={editingDevice?.layoutMode || 'FULL'} className="w-full px-3 py-2 border rounded-md">
                                        <option value="FULL">Full Screen (Single)</option>
                                        <option value="SPLIT">Vertical Split (Top/Bottom)</option>
                                        <option value="SPLIT_H">Horizontal Split (Left/Right)</option>
                                    </select>
                                </div>

                                {/* Dual Ratio Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Split Ratio (%)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={mainRatio}
                                                onChange={(e) => handleMainRatioChange(parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border rounded-md text-center"
                                            />
                                            <span className="text-[10px] text-gray-400 absolute bottom-1 right-2">Main</span>
                                        </div>
                                        <span className="text-gray-400">:</span>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={subRatio}
                                                onChange={(e) => handleSubRatioChange(parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border rounded-md text-center"
                                            />
                                            <span className="text-[10px] text-gray-400 absolute bottom-1 right-2">Sub</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">Main Zone vs Sub Zone percentage.</p>
                                </div>

                                <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsFormOpen(false); setEditingDevice(null); }}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
                                        {editingDevice ? 'Update Device' : 'Register Device'}
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialDevices.map((device) => (
                    <Card key={device.id} className={cn("transition-all", !device.isActive && "opacity-60 bg-gray-50")}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-medium flex items-center">
                                <Monitor className="w-5 h-5 mr-2 text-gray-500" />
                                {device.name}
                            </CardTitle>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => toggleDeviceStatus(device.id, !device.isActive)}
                                    className={cn("p-1 rounded-full", device.isActive ? "text-green-600 bg-green-100" : "text-gray-400 bg-gray-200")}
                                    title="Toggle Status"
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => openEdit(device)}
                                    className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteDevice(device.id)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>Location: {device.location || 'N/A'}</p>
                                <div className="flex items-center mt-2 flex-wrap gap-2">
                                    <LayoutTemplate className="w-4 h-4 mr-2" />
                                    <span className="font-medium">
                                        {device.layoutMode === 'FULL' ? 'Full Screen' :
                                            device.layoutMode === 'SPLIT_H' ? 'Horizontal Split' : 'Vertical Split'}
                                    </span>
                                    {device.layoutMode !== 'FULL' && (
                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full border">
                                            Ratio: {device.splitRatio || 50}:{100 - (device.splitRatio || 50)}
                                        </span>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <label className="text-xs font-semibold text-gray-400 flex items-center mb-1">
                                        <LinkIcon className="w-3 h-3 mr-1" /> Active Playlist
                                    </label>
                                    <select
                                        className="w-full text-xs p-1 border rounded bg-white"
                                        value={device.playlists[0]?.playlistId || ''}
                                        onChange={(e) => handlePlaylistChange(device.id, e.target.value)}
                                    >
                                        <option value="">No Playlist Assigned</option>
                                        {playlists.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="text-xs pt-4 text-gray-400">
                                    ID: {device.id}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {initialDevices.length === 0 && !isFormOpen && (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                        <Monitor className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No devices registered yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
