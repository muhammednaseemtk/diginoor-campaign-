'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhotoArea } from '@/lib/types/template';
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
} from 'lucide-react';

export default function AdminCreateTemplatePage() {
  const router = useRouter();

  // Template form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Conferences & Events');
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preview state
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle uploaded poster image
  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, SVG).');
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
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      router.push('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving template';
      setErrorMsg(msg);
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
                <Label htmlFor="category" className="text-xs font-semibold text-white">
                  Category
                </Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-2.5 py-1 text-sm text-white shadow-xs focus:outline-none focus:border-white"
                >
                  <option value="Conferences & Events" className="bg-[#111111] text-white">Conferences &amp; Events</option>
                  <option value="Corporate & Awards" className="bg-[#111111] text-white">Corporate &amp; Awards</option>
                  <option value="Concerts & Music" className="bg-[#111111] text-white">Concerts &amp; Music</option>
                  <option value="Sports & Fitness" className="bg-[#111111] text-white">Sports &amp; Fitness</option>
                  <option value="Celebrations" className="bg-[#111111] text-white">Celebrations</option>
                  <option value="Fun & Retro" className="bg-[#111111] text-white">Fun &amp; Retro</option>
                  <option value="Other" className="bg-[#111111] text-white">Other</option>
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
                    ? 'Drag the box or handles to adjust the photo position and size.'
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
    </div>
  );
}
