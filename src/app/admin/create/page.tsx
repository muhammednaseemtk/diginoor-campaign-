'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PhotoArea, PosterTextOverlay } from '@/lib/types/template';
import { broadcastPosterChange } from '@/lib/poster-sync';
import { InteractiveAdminCanvas } from '@/components/admin/InteractiveAdminCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft,
  UploadCloud,
  Save,
  Eye,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Type,
  Plus,
  Trash2,
} from 'lucide-react';

export default function AdminCreateTemplatePage() {
  // Floating Toast / Snackbar state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Template form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Conferences & Events');
  const [categories, setCategories] = useState<string[]>([
    'Conferences & Events',
    'Corporate & Awards',
    'Concerts & Music',
    'Sports & Fitness',
    'Celebrations',
    'Fun & Retro',
    'Ready-Made Posters',
    'Other',
  ]);
  const [showInlineCategoryInput, setShowInlineCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [description, setDescription] = useState('');

  // Poster Image state
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [posterWidth, setPosterWidth] = useState<number>(1080);
  const [posterHeight, setPosterHeight] = useState<number>(1350);

  // Photo Area coordinates
  const [photoArea, setPhotoArea] = useState<PhotoArea>({
    x: 200,
    y: 250,
    width: 680,
    height: 650,
    borderRadius: 16,
    layer: 'inside',
  });

  // Text overlays state
  const [textOverlays, setTextOverlays] = useState<PosterTextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preview state
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.categories)) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  // Handle uploaded poster image
  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WebP, SVG).', 'error');
      return;
    }

    setSelectedFile(file);

    // Automatically generate title and slug if not set
    if (!title.trim()) {
      const clean = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(clean);
      setSlug(clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 1080;
        const naturalH = img.naturalHeight || 1350;
        setPosterWidth(naturalW);
        setPosterHeight(naturalH);
        setPosterImage(dataUrl);

        // Center default photo box inside the uploaded poster dimensions
        const defaultW = Math.round(naturalW * 0.55);
        const defaultH = Math.round(naturalH * 0.45);
        const defaultX = Math.round((naturalW - defaultW) / 2);
        const defaultY = Math.round(naturalH * 0.22);

        let detectedX = defaultX;
        let detectedY = defaultY;
        let detectedW = defaultW;
        let detectedH = defaultH;
        let detectedLayer: 'inside' | 'behind' = 'inside';

        // Check if image contains a transparent cutout window
        try {
          const offscreen = document.createElement('canvas');
          offscreen.width = naturalW;
          offscreen.height = naturalH;
          const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
          if (offCtx) {
            offCtx.drawImage(img, 0, 0);
            const imgData = offCtx.getImageData(0, 0, naturalW, naturalH);
            const d = imgData.data;
            const marginX = Math.max(15, Math.floor(naturalW * 0.02));
            const marginY = Math.max(15, Math.floor(naturalH * 0.02));
            let minX = naturalW, maxX = 0, minY = naturalH, maxY = 0;
            let transCount = 0;

            for (let y = marginY; y < naturalH - marginY; y++) {
              for (let x = marginX; x < naturalW - marginX; x++) {
                const idx = (y * naturalW + x) * 4;
                if (d[idx + 3] < 128) {
                  transCount++;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            if (transCount > 500 && maxX > minX && maxY > minY) {
              const cw = maxX - minX + 1;
              const ch = maxY - minY + 1;
              if (cw >= 100 && ch >= 100) {
                detectedX = minX;
                detectedY = minY;
                detectedW = cw;
                detectedH = ch;
                detectedLayer = 'behind';
              }
            }
          }
        } catch (e) {
          console.warn('Transparent cutout detection skipped:', e);
        }

        setPhotoArea({
          x: detectedX,
          y: detectedY,
          width: detectedW,
          height: detectedH,
          borderRadius: 20,
          layer: detectedLayer,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleCoordinateChange = (field: keyof PhotoArea, val: number | string) => {
    setPhotoArea((prev) => ({
      ...prev,
      [field]: typeof val === 'number' ? Math.max(0, val) : val,
    }));
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const existing = categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setCategory(existing);
      setShowInlineCategoryInput(false);
      setNewCategoryName('');
      return;
    }

    try {
      setCreatingCategory(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      const createdCat = data.category || trimmed;
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        setCategories((prev) => (prev.includes(createdCat) ? prev : [...prev, createdCat]));
      }
      setCategory(createdCat);
      setShowInlineCategoryInput(false);
      setNewCategoryName('');
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleAddText = () => {
    const newId = `txt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: newId,
        text: 'Custom Poster Text',
        fontSize: Math.max(32, Math.round(posterHeight * 0.04)),
        color: '#ffffff',
        x: Math.round(posterWidth / 2),
        y: Math.round(posterHeight * 0.85),
        textAlign: 'center',
        fontWeight: 'bold',
        shadowColor: 'rgba(0, 0, 0, 0.85)',
        shadowBlur: 8,
      },
    ]);
    setSelectedTextId(newId);
  };

  const handleUpdateText = (index: number, field: keyof PosterTextOverlay, value: string | number) => {
    setTextOverlays((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveText = (index: number) => {
    setTextOverlays((prev) => {
      const target = prev[index];
      if (target && target.id === selectedTextId) {
        setSelectedTextId(null);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Please enter a template title.');
      return;
    }
    if (!posterImage) {
      setErrorMsg('Please upload a poster design image first.');
      return;
    }

    const finalSlug =
      slug.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    try {
      setSaving(true);
      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        formData.append('slug', finalSlug);
        formData.append('category', category);
        formData.append('description', description || `Ready-made ${title} poster template.`);
        formData.append('width', String(posterWidth));
        formData.append('height', String(posterHeight));
        formData.append('photoArea', JSON.stringify(photoArea));
        if (textOverlays.length > 0) {
          formData.append('textOverlays', JSON.stringify(textOverlays));
        }

        res = await fetch('/api/templates', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            slug: finalSlug,
            category,
            description: description || `Ready-made ${title} poster template.`,
            width: posterWidth,
            height: posterHeight,
            posterImage,
            photoArea,
            textOverlays,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      broadcastPosterChange({ type: 'INSERT', template: data });
      showToast('Poster created successfully!', 'success');
      setErrorMsg(null);

      // Clear the creation form after successful creation
      setTitle('');
      setSlug('');
      setDescription('');
      setPosterImage(null);
      setSelectedFile(null);
      setTextOverlays([]);
      setPhotoArea({
        x: 200,
        y: 250,
        width: 680,
        height: 650,
        borderRadius: 16,
        layer: 'inside',
      });
      setShowSamplePreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving template';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="icon" className="rounded-xl border-[#262626] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Configure Poster Template
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA]">
              Upload pre-designed artwork and configure the designated photo area.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !posterImage || !title.trim()}
            className="rounded-xl px-5 h-11 font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Publishing...' : 'Publish Template'}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Form & Coordinates */}
        <div className="lg:col-span-4 space-y-6 w-full max-w-full">
          {/* Card 1: Poster Upload */}
          <Card className="rounded-2xl border-[#262626] bg-[#111111] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                <UploadCloud className="h-4 w-4 text-white" />
                <span>1. Poster Design Artwork</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA]">
                Upload your ready-made design. Native dimensions will be automatically detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePosterUpload}
                className="hidden"
              />

              {posterImage ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#0D0D0D] p-3 rounded-xl border border-[#262626]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-white">Artwork Uploaded</span>
                    </div>
                    <span className="font-mono text-[#A1A1AA]">
                      {posterWidth} × {posterHeight} px
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-xs border-[#262626] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Poster Image
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-[#2A2A2A] bg-[#0D0D0D] hover:border-neutral-500 hover:bg-[#141414] cursor-pointer transition-colors"
                >
                  <UploadCloud className="h-8 w-8 text-[#71717A] mb-2" />
                  <span className="text-sm font-semibold text-white">Upload Poster File</span>
                  <span className="text-[11px] text-[#71717A] mt-0.5">
                    PNG, JPG, or SVG
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Photo Placeholder Coordinates */}
          <Card className="rounded-2xl border-[#262626] bg-[#111111] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-white" />
                  <span>2. Photo Placeholder Area</span>
                </div>
                {posterImage && (
                  <Button
                    type="button"
                    variant={showSamplePreview ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-lg px-2.5"
                    onClick={() => setShowSamplePreview(!showSamplePreview)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    {showSamplePreview ? 'Hide Face Test' : 'Test With Photo'}
                  </Button>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA]">
                Drag the box on the canvas or type exact pixel values below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">X Position (px)</Label>
                  <Input
                    type="number"
                    value={photoArea.x}
                    onChange={(e) => handleCoordinateChange('x', Number(e.target.value))}
                    disabled={!posterImage}
                    className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">Y Position (px)</Label>
                  <Input
                    type="number"
                    value={photoArea.y}
                    onChange={(e) => handleCoordinateChange('y', Number(e.target.value))}
                    disabled={!posterImage}
                    className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">Width (px)</Label>
                  <Input
                    type="number"
                    value={photoArea.width}
                    onChange={(e) => handleCoordinateChange('width', Number(e.target.value))}
                    disabled={!posterImage}
                    className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">Height (px)</Label>
                  <Input
                    type="number"
                    value={photoArea.height}
                    onChange={(e) => handleCoordinateChange('height', Number(e.target.value))}
                    disabled={!posterImage}
                    className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">Corner Radius (px)</Label>
                  <Input
                    type="number"
                    value={photoArea.borderRadius || 0}
                    onChange={(e) => handleCoordinateChange('borderRadius', Number(e.target.value))}
                    disabled={!posterImage}
                    className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white">Layer Placement</Label>
                  <select
                    value={photoArea.layer || 'inside'}
                    onChange={(e) => handleCoordinateChange('layer', e.target.value)}
                    disabled={!posterImage}
                    className="flex h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-2.5 py-1 text-xs text-white shadow-xs focus:outline-none focus:border-white"
                  >
                    <option value="inside" className="bg-[#111111] text-white">Inside Photo Area (Solid Poster)</option>
                    <option value="behind" className="bg-[#111111] text-white">Behind Poster (Cutout Frame)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#0D0D0D] p-3 rounded-xl border border-[#262626] text-[11px] text-[#A1A1AA]">
                <Info className="h-4 w-4 text-white shrink-0 mt-0.5" />
                <span>
                  Tip: You can drag or resize the box on the preview canvas with your mouse to visually position the photo area!
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Template Metadata */}
          <Card className="rounded-2xl border-[#262626] bg-[#111111] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-white" />
                <span>3. Template Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-white">
                  Template Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Future Tech Summit Speaker"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-xs font-semibold text-white">
                  URL Slug
                </Label>
                <Input
                  id="slug"
                  placeholder="e.g. tech-summit-speaker"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-xs font-semibold text-white">
                    Category
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowInlineCategoryInput(!showInlineCategoryInput)}
                    className="text-[11px] text-[#A1A1AA] hover:text-white flex items-center gap-1 font-medium transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{showInlineCategoryInput ? 'Cancel' : 'New Category'}</span>
                  </button>
                </div>

                {showInlineCategoryInput && (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name..."
                      className="h-8 rounded-lg text-xs bg-[#0D0D0D] border-[#2A2A2A] text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={creatingCategory || !newCategoryName.trim()}
                      onClick={handleCreateCategory}
                      className="h-8 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold px-3"
                    >
                      {creatingCategory ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                )}

                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-2.5 py-1 text-sm text-white shadow-xs focus:outline-none focus:border-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#111111] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold text-white">
                  Short Description
                </Label>
                <Input
                  id="desc"
                  placeholder="Brief description for users on the home page"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 rounded-lg text-sm bg-[#0D0D0D] border-[#2A2A2A] text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Poster Text Overlays */}
          <Card className="rounded-2xl border-[#262626] bg-[#111111] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <Type className="h-4 w-4 text-white" />
                  <span>4. Text Overlays (Optional)</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddText}
                  className="h-7 text-xs border-[#262626] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] rounded-lg"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Text
                </Button>
              </div>
              <CardDescription className="text-xs text-[#A1A1AA]">
                Add custom titles, dates, or captions on this poster. They will appear on user previews and final downloads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {textOverlays.length === 0 ? (
                <p className="text-[11px] text-[#71717A]">
                  No custom text added. Click &quot;Add Text&quot; to overlay titles or captions onto this poster.
                </p>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {textOverlays.map((textItem, idx) => {
                    const itemKey = textItem.id || `txt-${idx}`;
                    const isSelected = selectedTextId === itemKey;
                    return (
                      <div
                        key={itemKey}
                        onClick={() => setSelectedTextId(itemKey)}
                        className={`bg-[#0D0D0D] border rounded-xl p-3 space-y-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-sky-500 ring-1 ring-sky-500/50 bg-[#0f172a]/50'
                            : 'border-[#262626] hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-[#A1A1AA]">
                              Text #{idx + 1}
                            </span>
                            {isSelected && (
                              <span className="bg-sky-500/20 text-sky-400 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveText(idx);
                            }}
                            className="text-[#71717A] hover:text-red-400 p-1 transition-colors"
                            title="Remove text"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Input
                          value={textItem.text}
                          onChange={(e) => handleUpdateText(idx, 'text', e.target.value)}
                          onFocus={() => setSelectedTextId(itemKey)}
                          placeholder="e.g. KEYNOTE SPEAKER"
                          className="h-8 rounded-lg text-xs bg-[#111111] border-[#2A2A2A] text-white"
                        />

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[10px] text-[#71717A] block mb-0.5">Size (px)</Label>
                            <Input
                              type="number"
                              value={textItem.fontSize || 48}
                              onChange={(e) =>
                                handleUpdateText(idx, 'fontSize', Math.max(12, Number(e.target.value)))
                              }
                              onFocus={() => setSelectedTextId(itemKey)}
                              className="h-7 rounded-lg text-xs bg-[#111111] border-[#2A2A2A] text-white"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] text-[#71717A] block mb-0.5">Color</Label>
                            <div className="flex items-center gap-1 bg-[#111111] border border-[#2A2A2A] rounded-lg px-1.5 py-0.5 h-7">
                              <input
                                type="color"
                                value={textItem.color || '#ffffff'}
                                onChange={(e) => handleUpdateText(idx, 'color', e.target.value)}
                                onFocus={() => setSelectedTextId(itemKey)}
                                className="h-4 w-4 border-0 bg-transparent cursor-pointer rounded"
                              />
                              <span className="text-[9px] font-mono text-[#A1A1AA] uppercase truncate">
                                {textItem.color || '#FFF'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] text-[#71717A] block mb-0.5">X Pos (px)</Label>
                            <Input
                              type="number"
                              value={textItem.x}
                              onChange={(e) =>
                                handleUpdateText(idx, 'x', Math.max(0, Number(e.target.value)))
                              }
                              onFocus={() => setSelectedTextId(itemKey)}
                              className="h-7 rounded-lg text-xs bg-[#111111] border-[#2A2A2A] text-white"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] text-[#71717A] block mb-0.5">Y Pos (px)</Label>
                            <Input
                              type="number"
                              value={textItem.y}
                              onChange={(e) =>
                                handleUpdateText(idx, 'y', Math.max(0, Number(e.target.value)))
                              }
                              onFocus={() => setSelectedTextId(itemKey)}
                              className="h-7 rounded-lg text-xs bg-[#111111] border-[#2A2A2A] text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Visual Canvas Area */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border-[#262626] overflow-hidden bg-[#111111] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-[#262626] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Eye className="h-4 w-4 text-white" />
                  <span>Visual Placeholder Editor</span>
                </CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA]">
                  {posterImage
                    ? 'Drag photo slot or handles • Click & drag text on canvas to position anywhere.'
                    : 'Upload a poster image to start configuring.'}
                </CardDescription>
              </div>

              {posterImage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showSamplePreview ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs rounded-xl"
                    onClick={() => setShowSamplePreview(!showSamplePreview)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    {showSamplePreview ? 'Hide Photo Test' : 'Test with Sample Photo'}
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center bg-[#0A0A0A] min-h-[550px]">
              {posterImage ? (
                <InteractiveAdminCanvas
                  posterImageUrl={posterImage}
                  posterWidth={posterWidth}
                  posterHeight={posterHeight}
                  photoArea={photoArea}
                  onPhotoAreaChange={setPhotoArea}
                  showSamplePreview={showSamplePreview}
                  sampleImageUrl="/templates/sample-portrait.jpg"
                  textOverlays={textOverlays}
                  onTextOverlaysChange={setTextOverlays}
                  selectedTextId={selectedTextId}
                  onSelectTextId={setSelectedTextId}
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-16 rounded-2xl border-2 border-dashed border-[#2A2A2A] bg-[#0D0D0D] hover:border-neutral-500 hover:bg-[#141414] cursor-pointer text-center max-w-md transition-colors"
                >
                  <UploadCloud className="h-12 w-12 text-[#71717A] mb-3" />
                  <h3 className="font-bold text-lg text-white">Upload Poster Artwork First</h3>
                  <p className="text-xs text-[#71717A] mt-1 max-w-xs">
                    Choose a ready-made poster file (PNG, JPG, or SVG) to view it here and configure the designated photo area.
                  </p>
                  <Button size="sm" className="mt-4 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold">
                    Select File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Toast / Snackbar Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-xs sm:text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-[#141414]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/20'
              : 'bg-[#141414]/95 border-red-500/40 text-red-300 shadow-red-950/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span className="text-white">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-[#71717A] hover:text-white transition-colors ml-2 font-bold text-base leading-none p-0.5"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
