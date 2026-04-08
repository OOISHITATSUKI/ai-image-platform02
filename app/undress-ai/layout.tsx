import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Undress Free — No Login Required | ImageNude',
  description: 'Undress AI images instantly. 100% free to try, no account needed. Powered by advanced AI. Results in seconds.',
  alternates: { canonical: 'https://imagenude.com/undress-ai' },
  openGraph: {
    title: 'AI Undress Free — No Login Required | ImageNude',
    description: 'Undress AI images instantly. 100% free to try, no account needed. Powered by advanced AI. Results in seconds.',
    url: 'https://imagenude.com/undress-ai',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
};

export default function UndressAiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
