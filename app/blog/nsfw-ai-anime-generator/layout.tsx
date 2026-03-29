import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Best NSFW AI Anime Generator 2025 — Hentai & Realistic Waifu Art | Image Nude',
  description: 'The best NSFW AI anime generators in 2025. Generate hentai, realistic anime art, and adult anime characters instantly. Free to start, no experience needed.',
  alternates: { canonical: 'https://imagenude.com/blog/nsfw-ai-anime-generator' },
  openGraph: {
    title: 'Best NSFW AI Anime Generator 2025 — Hentai & Realistic Waifu Art | Image Nude',
    description: 'The best NSFW AI anime generators in 2025. Generate hentai, realistic anime art, and adult anime characters instantly. Free to start, no experience needed.',
    url: 'https://imagenude.com/blog/nsfw-ai-anime-generator',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
