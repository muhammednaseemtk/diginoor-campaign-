'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PhotoArea, PosterTemplate } from '@/lib/types/template';
import { InteractiveAdminCanvas } from '@/components/admin/InteractiveAdminCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  PlusCircle,
  ExternalLink,
  Trash2,
  Layers,
  Sliders,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Eye,
} from 'lucide-react';

export default function AdminDashboard() {
  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PosterTemplate | null>(null);
  const [editingPhotoArea, setEditingPhotoArea] = useState<PhotoArea | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showSampleInEdit, setShowSampleInEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isCancelled = false;

    fetch('/api/templates')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          if (Array.isArray(data)) {
            setTemplates(data);
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Error loading templates';
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const reloadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch templates');
      if (Array.isArray(data)) setTemplates(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading templates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Automatic poster upload:
   * Admin selects a poster file -> Image is stored in Supabase Storage,
   * database record & photo placeholder configuration are created automatically,
   * and the poster becomes immediately available to users.
   */
  const handleAutoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, or SVG).');
      return;
    }

    setUploading(true);
    setUploadSuccess(null);
    setError(null);

    try {
      // 1. Detect image dimensions in browser
      const objectUrl = URL.createObjectURL(file);
      const img = document.createElement('img');
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = objectUrl;
      });

      const width = img.naturalWidth || 1080;
      const height = img.naturalHeight || 1350;
      URL.revokeObjectURL(objectUrl);

      // Clean title from filename
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // 2. Send to API for automatic storage upload and database record creation
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', cleanTitle);
      formData.append('width', String(width));
      formData.append('height', String(height));
      formData.append('category', 'Ready-Made Posters');

      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      const newTemplate = await res.json();
      if (!res.ok) {
        throw new Error(newTemplate?.error || 'Failed to upload and create poster');
      }

      // 3. Immediately make it available in the poster list
      setTemplates((prev) => [newTemplate, ...prev]);
      setUploadSuccess(`"${newTemplate.title}" was uploaded to storage and automatically configured! It is now live for users.`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading poster';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will clean up its stored image and configuration.`)) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete template');
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id && t.slug !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete template';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editingPhotoArea) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/templates/${editingTemplate.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoArea: editingPhotoArea,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save photo area configuration');
      }
      const updated = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id || t.slug === updated.slug ? updated : t))
      );
      setUploadSuccess(`Photo area for "${updated.title}" was saved successfully!`);
      setEditingTemplate(null);
      setEditingPhotoArea(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating template';
      alert(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-24">
      {/* Hidden file input for automatic 1-click upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAutoUpload}
        className="hidden"
      />

      {/* Admin Header: Only Add & Manage Ready-Made Posters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Poster Templates
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
            Admin panel for uploading ready-made poster templates. Uploading automatically stores the image and configures the user-photo placeholder area.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl font-semibold shadow-xs bg-white text-black hover:bg-neutral-200 transition-colors w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                Uploading &amp; Configuring...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Poster (Automatic)
              </>
            )}
          </Button>

          <Link href="/admin/create">
            <Button variant="outline" className="rounded-xl font-semibold border-[#262626] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4 text-white" />
              Advanced Setup
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
          <button
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs sm:text-sm flex items-center justify-between">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <Button onClick={reloadTemplates} variant="outline" size="sm" className="h-7 text-xs border-[#262626]">
              Retry
            </Button>
            <button
              onClick={() => setError(null)}
              className="text-red-400 font-bold ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Automatic Fast-Drop Banner */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="mb-8 p-6 rounded-2xl border-2 border-dashed border-[#262626] bg-[#0D0D0D] hover:bg-[#141414] hover:border-neutral-500 cursor-pointer transition-colors flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-xl bg-[#161616] border border-[#262626] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              One-Click Automatic Poster Upload
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Click here to upload a poster image. The system automatically stores it in Supabase Storage, calculates the photo placement area, and makes it available to users instantly.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          disabled={uploading}
          className="rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold shrink-0 text-xs px-4"
        >
          {uploading ? 'Processing...' : 'Choose Poster File'}
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid place-items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
            <span className="text-xs text-[#71717A] font-medium">Loading templates...</span>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-[#262626] rounded-2xl bg-[#0D0D0D] max-w-lg mx-auto">
          <Layers className="h-12 w-12 text-[#71717A] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No templates yet</h3>
          <p className="text-xs text-[#A1A1AA] mb-6">
            Upload your first ready-made poster to get started.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="bg-white text-black hover:bg-neutral-200 font-semibold rounded-xl"
          >
            Upload Poster
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="flex flex-col rounded-2xl overflow-hidden border-[#262626] bg-[#111111] hover:border-neutral-500 transition-colors duration-200 shadow-xs"
            >
              {/* Poster Preview */}
              <div className="relative aspect-[4/5] w-full bg-[#0A0A0A] p-2 overflow-hidden border-b border-[#262626] flex items-center justify-center">
                <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#262626]">
                  <Image
                    src={template.posterImage}
                    alt={template.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain"
                  />
                </div>

                {/* Dimension Badge */}
                <span className="absolute top-4 left-4 z-10 rounded-md bg-[#111111]/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-[#A1A1AA] border border-[#262626]">
                  {template.width} × {template.height} px
                </span>

                {/* Category Badge */}
                <span className="absolute top-4 right-4 z-10 rounded-md bg-[#161616] text-white border border-[#2A2A2A] px-2.5 py-1 text-[11px] font-medium">
                  {template.category}
                </span>
              </div>

              {/* Card Meta */}
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold text-white truncate">{template.title}</CardTitle>
                <CardDescription className="text-xs text-[#71717A] truncate">
                  Slug: /{template.slug}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between space-y-4">
                {/* Photo Area Coordinates Box */}
                <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#262626] text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-white text-[11px]">
                    <Sliders className="h-3.5 w-3.5 text-white" />
                    <span>Automatic Photo Placement</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-[#A1A1AA] font-mono">
                    <div>
                      Pos: ({template.photoArea.x}, {template.photoArea.y})
                    </div>
                    <div>
                      Size: {template.photoArea.width} × {template.photoArea.height}
                    </div>
                    <div>Radius: {template.photoArea.borderRadius || 0}px</div>
                    <div>Layer: {template.photoArea.layer || 'inside'}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#262626]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template);
                      setEditingPhotoArea({ ...template.photoArea });
                      setShowSampleInEdit(false);
                    }}
                    className="flex-1 rounded-xl text-xs font-semibold border-[#262626] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] transition-colors"
                  >
                    <Sliders className="mr-1.5 h-3.5 w-3.5 text-white" />
                    Configure Slot
                  </Button>

                  <Link href={`/poster/${template.id}`} className="flex-1">
                    <Button size="sm" className="w-full rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-[#71717A] hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                    disabled={deletingId === template.id}
                    onClick={() => handleDelete(template.id, template.title)}
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Photo Slot Configuration Modal */}
      {editingTemplate && editingPhotoArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#262626] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-white" />
                  <span>Configure Photo Area: {editingTemplate.title}</span>
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Drag the slot handles on the poster or enter exact pixel values to place user photos with 100% precision.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditingPhotoArea(null);
                }}
                className="text-[#71717A] hover:text-white text-2xl font-bold p-1 leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-y-auto flex-1">
              {/* Canvas Preview Area */}
              <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 flex flex-col items-center justify-center min-h-[420px]">
                <div className="relative w-full max-w-[460px] flex items-center justify-center">
                  <InteractiveAdminCanvas
                    posterImageUrl={editingTemplate.posterImage}
                    posterWidth={editingTemplate.width}
                    posterHeight={editingTemplate.height}
                    photoArea={editingPhotoArea}
                    onPhotoAreaChange={(newArea) => setEditingPhotoArea(newArea)}
                    showSamplePreview={showSampleInEdit}
                    sampleImageUrl="/templates/sample-portrait.jpg"
                  />
                </div>
                <div className="mt-2 text-[11px] text-[#71717A] text-center">
                  Drag box to reposition • Drag corner/side handles to resize
                </div>
              </div>

              {/* Exact Coordinate Form Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                  <span className="text-xs font-semibold text-white">Exact Dimensions (px)</span>
                  <Button
                    type="button"
                    variant={showSampleInEdit ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-lg px-2.5 bg-white text-black hover:bg-neutral-200"
                    onClick={() => setShowSampleInEdit(!showSampleInEdit)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    {showSampleInEdit ? 'Hide Face Test' : 'Test With Portrait'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">X Position (px)</label>
                    <input
                      type="number"
                      value={editingPhotoArea.x}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, x: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">Y Position (px)</label>
                    <input
                      type="number"
                      value={editingPhotoArea.y}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, y: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">Width (px)</label>
                    <input
                      type="number"
                      value={editingPhotoArea.width}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, width: Math.max(10, Number(e.target.value)) })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">Height (px)</label>
                    <input
                      type="number"
                      value={editingPhotoArea.height}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, height: Math.max(10, Number(e.target.value)) })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">Corner Radius (px)</label>
                    <input
                      type="number"
                      value={editingPhotoArea.borderRadius ?? 0}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, borderRadius: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#A1A1AA]">Layer Placement</label>
                    <select
                      value={editingPhotoArea.layer || 'inside'}
                      onChange={(e) =>
                        setEditingPhotoArea({ ...editingPhotoArea, layer: e.target.value as 'inside' | 'behind' })
                      }
                      className="w-full mt-1 bg-[#0D0D0D] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-white outline-none"
                    >
                      <option value="inside">Inside (Standard overlay)</option>
                      <option value="behind">Behind (Transparent cutout)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-3 text-[11px] text-[#A1A1AA] space-y-1">
                  <div className="font-semibold text-white">Summary for this Poster:</div>
                  <div>Poster Size: {editingTemplate.width} × {editingTemplate.height} px</div>
                  <div>Slot Size: {editingPhotoArea.width} × {editingPhotoArea.height} px</div>
                  <div>Slot Offset: X: {editingPhotoArea.x}, Y: {editingPhotoArea.y}</div>
                  <div>Border Radius: {editingPhotoArea.borderRadius || 0}px</div>
                  <div>Render Mode: {editingPhotoArea.layer === 'behind' ? 'Photo Behind Poster' : 'Photo Clipped on Top'}</div>
                </div>

                {/* Save & Cancel */}
                <div className="pt-4 border-t border-[#262626] flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(null);
                      setEditingPhotoArea(null);
                    }}
                    className="border-[#262626] text-white hover:bg-[#1A1A1A] rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingEdit}
                    onClick={handleSaveEdit}
                    className="bg-white text-black hover:bg-neutral-200 font-semibold rounded-xl"
                  >
                    {savingEdit ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
