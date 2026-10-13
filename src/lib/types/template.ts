export interface PosterTextOverlay {
  id?: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  shadowColor?: string;
  shadowBlur?: number;
}

export interface PhotoArea {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  layer?: 'inside' | 'behind';
  textOverlays?: PosterTextOverlay[];
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
  textOverlays?: PosterTextOverlay[];
  createdAt: string;
}

export type CreateTemplateInput = Omit<PosterTemplate, 'id' | 'createdAt'>;
