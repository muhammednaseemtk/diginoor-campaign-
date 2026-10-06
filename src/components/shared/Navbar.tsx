'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Layers, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const headerLogoSrc = '/Logo PNG 01.svg';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#262626] bg-[#050505]/95 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="flex items-center justify-center rounded-xl bg-[#0D0D0D] border border-[#262626] p-1.5 sm:p-2 shadow-xs shrink-0 group-hover:border-neutral-500 transition-colors duration-200">
            <Image
              src={headerLogoSrc}
              alt="Diginoor Logo"
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0"
              priority
              unoptimized
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white group-hover:text-neutral-300 transition-colors leading-none">
              Diginoor
            </span>
            <span className="text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#71717A] mt-1 leading-none">
              READY-MADE POSTER REPLACER
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              pathname === '/' || pathname.startsWith('/poster')
                ? 'bg-[#161616] text-white font-semibold border border-[#262626]'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>Ready-Made Posters</span>
          </Link>

          {/* Admin indicator visible ONLY when already within the admin route */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-white text-black shadow-xs">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Admin Portal</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
