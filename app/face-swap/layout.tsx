import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Face Swap Adults — Free & Instant | ImageNude',
  description: 'Swap faces in any image with AI. Free to use, no registration required. Realistic results in seconds.',
  alternates: { canonical: 'https://imagenude.com/face-swap' },
  openGraph: {
    title: 'AI Face Swap Adults — Free & Instant | ImageNude',
    description: 'Swap faces in any image with AI. Free to use, no registration required. Realistic results in seconds.',
    url: 'https://imagenude.com/face-swap',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
};

export default function FaceSwapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
