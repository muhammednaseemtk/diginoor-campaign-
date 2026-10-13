import { templateDb } from '@/lib/db/templates';
import { categoryDb } from '@/lib/db/categories';
import { HeroBanner } from '@/components/home/HeroBanner';
import { PosterGallery } from '@/components/home/PosterGallery';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [templates, categories] = await Promise.all([
    templateDb.getAll(),
    categoryDb.getAll(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20">
      <HeroBanner />
      <PosterGallery initialTemplates={templates} allCategories={categories} />
    </div>
  );
}
