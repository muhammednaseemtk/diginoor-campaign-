import Image from 'next/image';

export function Footer() {
  const footerLogoSrc = '/Logo PNG.svg';

  return (
    <footer className="mt-auto border-t border-[#262626] bg-[#050505] py-8 text-sm text-[#71717A]">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Supplied reference logo */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0D0D0D] border border-[#262626] p-2 rounded-xl flex items-center justify-center shadow-xs">
            <Image
              src={footerLogoSrc}
              alt="Diginoor Logo"
              width={24}
              height={24}
              className="h-5 w-5 object-contain"
              unoptimized
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">
              Diginoor
            </span>
            <span className="text-[11px] text-[#71717A]">
              Ready-Made Poster Photo Replacement Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#71717A]">Select Poster → Upload Photo → Download</span>
          <span className="text-[#262626]">|</span>
          <span className="text-[#71717A]">Instant High-Resolution Export</span>
        </div>
      </div>
    </footer>
  );
}
