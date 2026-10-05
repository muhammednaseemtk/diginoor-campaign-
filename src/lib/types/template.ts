export interface PhotoArea {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  layer?: 'inside' | 'behind';
}

export interface PosterTemplate {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  width: number;
  height: number;
  posterImage: string;
  photoArea: PhotoArea;
  sampleUserPhoto?: string;
  createdAt: string;
}

export type CreateTemplateInput = Omit<PosterTemplate, 'id' | 'createdAt'>;
