import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stable Diffusion NSFW Guide: Models, Settings & Tips (2026)',
  description: 'Complete Stable Diffusion NSFW guide for 2026. Best uncensored models, optimal settings, prompts — plus a zero-setup browser alternative for users without a GPU.',
  alternates: { canonical: 'https://imagenude.com/blog/stable-diffusion-nsfw-guide' },
  openGraph: {
    title: 'Stable Diffusion NSFW Guide: Models, Settings & Tips (2026)',
    description: 'Complete Stable Diffusion NSFW guide for 2026. Best uncensored models, optimal settings, prompts — plus a zero-setup browser alternative for users without a GPU.',
    url: 'https://imagenude.com/blog/stable-diffusion-nsfw-guide',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
