import { notFound } from 'next/navigation';
import { templateDb } from '@/lib/db/templates';
import { PosterWorkspace } from '@/components/poster/PosterWorkspace';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PosterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PosterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = await templateDb.getBySlug(slug);

  if (!template) {
    return {
      title: 'Poster Not Found - Diginoor',
    };
  }

  return {
    title: `${template.title} - Diginoor Poster Photo Replacement`,
    description: template.description || 'Upload your photo to instantly replace the photo area in this ready-made poster.',
  };
}

export default async function PosterPage({ params }: PosterPageProps) {
  const { slug } = await params;
  const template = (await templateDb.getBySlug(slug)) || (await templateDb.getById(slug));

  if (!template) {
    notFound();
  }

  return <PosterWorkspace template={template} />;
}
