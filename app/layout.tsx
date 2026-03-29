import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';
import Script from 'next/script';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'AI Nude Generator — Free AI Photo Generator | Image Nude',
  description: 'Generate AI nude images for free. Text to image, face swap, and undress AI. No sign up required. Try now.',
  keywords: ['AI nude generator', 'nude AI photo generator', 'nude pic generator', 'AI undress', 'NSFW AI', 'nude mode', 'face swap AI', 'text to image NSFW', 'free AI nude'],
  openGraph: {
    title: 'AI Nude Generator — Free AI Photo Generator | Image Nude',
    description: 'Generate AI nude images for free. Text to image, face swap, and undress AI. No sign up required. Try now.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    siteName: 'Image Nude',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Nude Generator — Free AI Photo Generator | Image Nude',
    description: 'Generate AI nude images for free. Text to image, face swap, and undress AI. No sign up required. Try now.',
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
        <meta name="rating" content="adult" />
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
