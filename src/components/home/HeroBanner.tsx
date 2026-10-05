import { Sparkles, UploadCloud, Download } from 'lucide-react';

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 text-center">
      <div className="max-w-4xl mx-auto px-4">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#262626] bg-[#111111] px-4 py-1.5 text-xs sm:text-sm font-medium text-[#A1A1AA] mb-6 shadow-xs">
          <Sparkles className="h-4 w-4 text-white" />
          <span>Zero Design Skills Needed • 1-Click Photo Replacement</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Ready-Made Posters,{' '}
          <span className="text-[#A1A1AA]">
            Your Photo.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
          Pick a professionally designed poster, upload your picture, and download the print-ready result.
        </p>

        {/* 3 Simple Steps Indicator */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#262626] bg-[#111111] shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#161616] border border-[#2A2A2A] text-white font-bold text-sm">
              1
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Select Poster</div>
              <div className="text-[11px] text-[#71717A]">Pick from ready-made designs</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#262626] bg-[#111111] shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#161616] border border-[#2A2A2A] text-white font-bold text-sm">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Upload Photo</div>
              <div className="text-[11px] text-[#71717A]">Auto-crops &amp; fits seamlessly</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#262626] bg-[#111111] shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#161616] border border-[#2A2A2A] text-white font-bold text-sm">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Download HD</div>
              <div className="text-[11px] text-[#71717A]">Export high-res PNG or JPG</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
