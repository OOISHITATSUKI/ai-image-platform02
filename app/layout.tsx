import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Image Nude — AI Undress & Nude Generator | Free',
  description: 'Upload any photo and let AI remove clothes instantly. Photorealistic nude generation with Nude Mode, Face Swap & Text-to-Image. Try free.',
  keywords: ['AI undress', 'AI nude generator', 'NSFW AI', 'nude mode', 'face swap AI', 'text to image NSFW', 'free AI nude'],
  openGraph: {
    title: 'Image Nude — AI Undress & Nude Generator',
    description: 'Upload any photo and let AI remove clothes instantly. Try free.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Nude — AI Undress & Nude Generator',
    description: 'Upload any photo and let AI remove clothes instantly. Try free.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.png',
    apple: '/logo-dark.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="c3ed5e74-ea4f-435f-bac5-7deade11fd68"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
