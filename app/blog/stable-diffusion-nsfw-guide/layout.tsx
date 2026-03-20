import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stable Diffusion NSFW Guide 2025 — Models, Prompts & Easier Alternatives',
  description: 'Complete guide to Stable Diffusion NSFW generation in 2025. Best models, prompts, settings — plus easier browser alternatives that require zero setup.',
  alternates: { canonical: 'https://imagenude.com/blog/stable-diffusion-nsfw-guide' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
