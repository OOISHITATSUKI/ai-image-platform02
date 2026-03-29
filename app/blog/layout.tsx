import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Nude & Undress Tools — Guides, Reviews & Tips | Image Nude',
  description: 'Honest reviews and guides for AI nude generators, undress tools, and face swap. Real testing, real screenshots.',
  alternates: { canonical: 'https://imagenude.com/blog' },
  openGraph: {
    title: 'AI Nude & Undress Tools — Guides, Reviews & Tips | Image Nude',
    description: 'Honest reviews and guides for AI nude generators, undress tools, and face swap. Real testing, real screenshots.',
    url: 'https://imagenude.com/blog',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
