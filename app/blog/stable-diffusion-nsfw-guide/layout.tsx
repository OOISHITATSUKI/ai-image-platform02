import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stable Diffusion NSFW Guide 2025 — Models, Settings & Browser Alternatives',
  description: 'Complete Stable Diffusion NSFW guide for 2025. Best uncensored models, optimal settings, prompts — plus a zero-setup browser alternative for users without a GPU.',
  alternates: { canonical: 'https://imagenude.com/blog/stable-diffusion-nsfw-guide' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
