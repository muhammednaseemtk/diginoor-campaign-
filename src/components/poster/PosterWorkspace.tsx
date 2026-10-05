'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PosterTemplate } from '@/lib/types/template';
import {
  loadImage,
  renderPosterToCanvas,
  generateExportDataUrl,
  triggerDownload,
} from '@/lib/image-processor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  UploadCloud,
  Download,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileImage,
  Info,
} from 'lucide-react';

interface PosterWorkspaceProps {
  template: PosterTemplate;
}

export function PosterWorkspace({ template }: PosterWorkspaceProps) {
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userPhotoName, setUserPhotoName] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterImgRef = useRef<HTMLImageElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-load poster background image
  useEffect(() => {
    let isCancelled = false;
    loadImage(template.posterImage)
      .then((img) => {
        if (!isCancelled) {
          posterImgRef.current = img;
          setPosterLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Error loading poster image:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [template.posterImage]);

  // Synchronize canvas whenever poster or user photo is loaded/updated
  useEffect(() => {
    if (!canvasRef.current || !posterImgRef.current) return;

    renderPosterToCanvas({
      posterImage: posterImgRef.current,
      userImage: userImgRef.current,
      photoArea: template.photoArea,
      canvas: canvasRef.current,
      showPlaceholderGuide: !userImgRef.current,
    });
  }, [template.photoArea, userPhotoUrl, posterLoaded]);

  // Handle image file selection
  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    setUserPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUserPhotoUrl(dataUrl);

      loadImage(dataUrl)
        .then((img) => {
          userImgRef.current = img;
          setDownloadSuccess(false);
          if (canvasRef.current && posterImgRef.current) {
            renderPosterToCanvas({
              posterImage: posterImgRef.current,
              userImage: img,
              photoArea: template.photoArea,
              canvas: canvasRef.current,
              showPlaceholderGuide: false,
            });
          }
        })
        .catch((err) => {
          console.error('Error rendering uploaded user photo:', err);
        });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleResetPhoto = () => {
    setUserPhotoUrl(null);
    setUserPhotoName('');
    userImgRef.current = null;
    setDownloadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (canvasRef.current && posterImgRef.current) {
      renderPosterToCanvas({
        posterImage: posterImgRef.current,
        userImage: null,
        photoArea: template.photoArea,
        canvas: canvasRef.current,
        showPlaceholderGuide: true,
      });
    }
  };

  const handleTrySamplePhoto = () => {
    const sampleSrc = template.sampleUserPhoto || '/templates/sample-portrait.jpg';
    setUserPhotoName('Sample Portrait Test');
    setUserPhotoUrl(sampleSrc);

    loadImage(sampleSrc).then((img) => {
      userImgRef.current = img;
      setDownloadSuccess(false);
      if (canvasRef.current && posterImgRef.current) {
        renderPosterToCanvas({
          posterImage: posterImgRef.current,
          userImage: img,
          photoArea: template.photoArea,
          canvas: canvasRef.current,
          showPlaceholderGuide: false,
        });
      }
    });
  };

  const handleDownload = async () => {
    if (!userPhotoUrl) {
      alert('Please upload your photo first to place into the poster.');
      return;
    }

    try {
      setIsDownloading(true);
      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const extension = exportFormat === 'png' ? 'png' : 'jpg';

      let dataUrl: string;
      if (canvasRef.current && userImgRef.current) {
        dataUrl = canvasRef.current.toDataURL(mimeType, exportFormat === 'png' ? 1.0 : 0.98);
      } else {
        dataUrl = await generateExportDataUrl(
          template.posterImage,
          userPhotoUrl,
          template.photoArea,
          mimeType,
          exportFormat === 'png' ? 1.0 : 0.98
        );
      }

      const filename = `${template.slug}-final.${extension}`;
      triggerDownload(dataUrl, filename);
      setDownloadSuccess(true);
    } catch (err) {
      console.error('Error exporting poster:', err);
      alert('Failed to generate high-resolution download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#71717A] hover:text-white mb-2 group transition-colors"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Ready-Made Posters</span>
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {template.title}
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">{template.description}</p>
        </div>

        {/* Badge info */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full bg-[#161616] border border-[#262626] px-3 py-1 text-xs font-semibold text-white">
            {template.category}
          </span>
          <span className="rounded-full bg-[#111111] border border-[#262626] px-3 py-1 text-xs font-medium text-[#A1A1AA]">
            {template.width} × {template.height} px
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Photo Upload & Action Controls */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1 w-full max-w-full">
          <Card className="rounded-2xl border-[#262626] bg-[#111111] overflow-hidden shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-white" />
                <span>Upload Your Photo</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA]">
                Your photo will automatically replace the designated photo area with optimal face-preserving auto-crop. No manual editing needed.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors duration-200 ${
                  isDragOver
                    ? 'border-white bg-[#1A1A1A]'
                    : userPhotoUrl
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-[#2A2A2A] bg-[#0D0D0D] hover:border-neutral-500 hover:bg-[#141414]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {userPhotoUrl ? (
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="font-semibold text-sm text-white">
                      Photo Placed Successfully!
                    </div>
                    <div className="text-xs text-[#A1A1AA] truncate max-w-[220px]">
                      {userPhotoName || 'Uploaded image'}
                    </div>
                    <span className="inline-block mt-2 text-xs text-white font-medium underline underline-offset-4">
                      Click to choose a different photo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-[#161616] border border-[#262626] text-white flex items-center justify-center shadow-xs">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        Click or drag &amp; drop your photo here
                      </div>
                      <div className="text-xs text-[#71717A] mt-1">
                        Supports high-resolution PNG, JPG, or WebP
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl font-medium mt-1 bg-white text-black hover:bg-neutral-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>

              {/* Instant Try-Sample-Photo button */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTrySamplePhoto}
                  className="text-xs rounded-xl border border-[#262626] bg-[#0D0D0D] text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-white" />
                  Try with Sample Photo
                </Button>

                {userPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPhoto}
                    className="text-xs text-[#71717A] hover:text-red-400 hover:bg-red-500/10"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Remove Photo
                  </Button>
                )}
              </div>

              {/* Photo Area Details Info Box */}
              <div className="rounded-xl bg-[#0D0D0D] border border-[#262626] p-4 space-y-2 text-xs text-[#A1A1AA]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Info className="h-4 w-4 text-white" />
                  <span>Designated Photo Area</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#71717A]">Slot Dimensions:</span>{' '}
                    <span className="font-semibold text-white">
                      {template.photoArea.width} × {template.photoArea.height} px
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A]">Slot Position:</span>{' '}
                    <span className="font-semibold text-white">
                      X: {template.photoArea.x}, Y: {template.photoArea.y}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A]">Auto-Fit Behavior:</span>{' '}
                    <span className="font-semibold text-white">Smart Cover &amp; Crop</span>
                  </div>
                  <div>
                    <span className="text-[#71717A]">Output Quality:</span>{' '}
                    <span className="font-semibold text-white">Full Resolution (Native)</span>
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="pt-2 border-t border-[#262626] space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA]">
                  <span>Export Format:</span>
                  <div className="flex items-center gap-1.5 bg-[#0D0D0D] border border-[#262626] p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setExportFormat('png')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        exportFormat === 'png'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-[#71717A] hover:text-white'
                      }`}
                    >
                      PNG (Lossless)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('jpeg')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        exportFormat === 'jpeg'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-[#71717A] hover:text-white'
                      }`}
                    >
                      JPG (Compact)
                    </button>
                  </div>
                </div>

                {/* Primary Download Button */}
                <Button
                  size="lg"
                  disabled={!userPhotoUrl || isDownloading}
                  onClick={handleDownload}
                  className="w-full h-12 rounded-xl text-base font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:bg-neutral-700 disabled:text-neutral-400"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Generating High-Res Poster...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      <span>Download Poster ({exportFormat.toUpperCase()})</span>
                    </>
                  )}
                </Button>

                {downloadSuccess && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Poster downloaded in {template.width}×{template.height}px resolution!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Poster Preview */}
        <div className="lg:col-span-7 order-1 lg:order-2 w-full max-w-full">
          <Card className="rounded-2xl border-[#262626] overflow-hidden bg-[#111111] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-[#262626] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Eye className="h-4 w-4 text-white" />
                  <span>Poster Live Preview</span>
                </CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA]">
                  {userPhotoUrl
                    ? 'Photo automatically cropped & positioned in high quality.'
                    : 'Showing photo placeholder guide. Upload your photo to replace.'}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
                <FileImage className="h-4 w-4 text-[#71717A]" />
                <span>{template.width} × {template.height} px</span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center bg-[#0A0A0A] min-h-[500px]">
              <div className="relative w-full max-w-[540px] rounded-2xl overflow-hidden border border-[#262626] bg-[#0D0D0D] flex items-center justify-center p-2">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto object-contain block select-none rounded-xl"
                  style={{ maxHeight: '720px' }}
                />

                {/* Floating placeholder guide indicator when no photo is uploaded */}
                {!userPhotoUrl && (
                  <div className="absolute top-4 right-4 z-10 bg-[#111111]/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-semibold text-white border border-[#262626] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    <span>Predefined Photo Slot Active</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
