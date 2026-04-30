import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Write NSFW AI Prompts: Tips for Better Results (2026)',
  description: 'Discover the best NSFW AI prompts for generating realistic images. Free to use, no sign up needed. Step-by-step guide with examples.',
  alternates: { canonical: 'https://imagenude.com/blog/how-to-write-nsfw-ai-prompts' },
  openGraph: {
    title: 'How to Write NSFW AI Prompts: Tips for Better Results (2026)',
    description: 'Discover the best NSFW AI prompts for generating realistic images. Free to use, no sign up needed. Step-by-step guide with examples.',
    url: 'https://imagenude.com/blog/how-to-write-nsfw-ai-prompts',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
