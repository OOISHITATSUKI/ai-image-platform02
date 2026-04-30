import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Best AI Portrait Generator for Realistic Faces (2026)',
  description: 'Generate photorealistic AI portraits with perfect facial detail. Comparison of the best AI portrait generators in 2026, with prompts and tips for lifelike results.',
  alternates: { canonical: 'https://imagenude.com/blog/ai-portrait-generator-realistic-faces' },
  openGraph: {
    title: 'Best AI Portrait Generator for Realistic Faces (2026)',
    description: 'Generate photorealistic AI portraits with perfect facial detail. Comparison of the best AI portrait generators in 2026, with prompts and tips for lifelike results.',
    url: 'https://imagenude.com/blog/ai-portrait-generator-realistic-faces',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
