'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PosterTemplate } from '@/lib/types/template';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Search, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';

interface PosterGalleryProps {
  initialTemplates: PosterTemplate[];
}

export function PosterGallery({ initialTemplates }: PosterGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    initialTemplates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set)];
  }, [initialTemplates]);

  const filteredTemplates = useMemo(() => {
    return initialTemplates.filter((template) => {
      const matchesCategory =
        selectedCategory === 'All' || template.category === selectedCategory;
      const matchesSearch =
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [initialTemplates, selectedCategory, searchQuery]);

  return (
    <div className="space-y-10">
      {/* Category Filter Pills & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-[#262626] pb-6">
        {/* Category Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <SlidersHorizontal className="h-4 w-4 text-[#71717A] mr-1.5 shrink-0 hidden sm:block" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-[#111111] text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-white border border-[#262626]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search ready-made posters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] pl-9 pr-4 py-2 text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-white transition-colors"
          />
        </div>
      </div>

      {/* Grid of Ready-Made Poster Cards */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] rounded-2xl border border-dashed border-[#262626] p-8">
          <ImageIcon className="mx-auto h-12 w-12 text-[#71717A] mb-3" />
          <h3 className="text-lg font-semibold text-white">No posters found</h3>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto mt-1 mb-6">
            We couldn&apos;t find any poster matching your filter. Try searching for a different keyword or reset filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group overflow-hidden border-[#262626] bg-[#111111] hover:border-neutral-500 transition-colors duration-200 flex flex-col rounded-2xl shadow-xs"
            >
              {/* Poster Preview Container */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0A0A0A] flex items-center justify-center p-3 border-b border-[#262626]">
                <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#262626] group-hover:scale-[1.01] transition-transform duration-200">
                  <Image
                    src={template.posterImage}
                    alt={template.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain"
                    priority
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

              {/* Poster Card Details */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5 mb-5">
                  <h3 className="font-bold text-lg text-white group-hover:text-neutral-200 transition-colors leading-snug">
                    {template.title}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                {/* "Use This Poster" Button */}
                <Link href={`/poster/${template.slug}`} className="w-full">
                  <Button className="w-full h-11 rounded-xl font-semibold bg-white hover:bg-neutral-200 text-black group/btn flex items-center justify-center gap-2 transition-colors">
                    <span>Use This Poster</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
