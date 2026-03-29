import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Write NSFW AI Prompts: Complete Guide for Realistic Results (2025) | Image Nude',
  description: 'Learn how to write NSFW AI prompts that generate photorealistic results every time. Includes prompt templates, negative prompts, and expert tips for beginners.',
  alternates: { canonical: 'https://imagenude.com/blog/how-to-write-nsfw-ai-prompts' },
  openGraph: {
    title: 'How to Write NSFW AI Prompts: Complete Guide for Realistic Results (2025) | Image Nude',
    description: 'Learn how to write NSFW AI prompts that generate photorealistic results every time. Includes prompt templates, negative prompts, and expert tips for beginners.',
    url: 'https://imagenude.com/blog/how-to-write-nsfw-ai-prompts',
    siteName: 'Image Nude',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
