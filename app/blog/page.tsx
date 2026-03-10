import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Blog — Image Nude | AI Image Generation Guides & Reviews',
  description: 'Expert guides, tool reviews, and tips for AI image generation. Learn about undress AI, face swap, NSFW AI tools, and more.',
  alternates: { canonical: 'https://imagenude.com/blog' },
};

const ARTICLES = [
  {
    slug: 'best-ai-undress-tools',
    title: 'Best AI Undress Tools 2025: Top 7 Ranked & Reviewed',
    description: 'We tested 7 AI undress tools in 2025. Honest comparison of quality, privacy, pricing, and ease of use — with a clear winner.',
    tag: 'Review',
    date: 'March 2025',
    readTime: '8 min read',
  },
  {
    slug: 'how-to-generate-nsfw-ai-images',
    title: 'How to Generate NSFW AI Images: Complete Guide (2025)',
    description: 'Step-by-step guide to generating NSFW AI images. Learn prompts, tools, settings, and best practices for realistic results.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '10 min read',
  },
  {
    slug: 'ai-face-swap-adults',
    title: 'AI Face Swap for Adults: Top Tools & How-To Guide (2025)',
    description: 'Complete guide to NSFW AI face swap tools. Compare top platforms, learn the process, and get tips for realistic results.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '7 min read',
  },
];

export default function BlogIndexPage() {
  return (
    <div className={styles.root}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>Image Nude</Link>
        <Link href="/register" className={styles.navCta}>Try Free →</Link>
      </nav>

      <div className={styles.hero}>
        <span className={styles.label}>Blog</span>
        <h1 className={styles.heading}>Guides, Reviews &<br /><span className={styles.accent}>Expert Tips</span></h1>
        <p className={styles.subtext}>Everything you need to know about AI image generation tools.</p>
      </div>

      <div className={styles.grid}>
        {ARTICLES.map((article) => (
          <Link key={article.slug} href={`/blog/${article.slug}`} className={styles.card}>
            <div className={styles.cardTag}>{article.tag}</div>
            <h2 className={styles.cardTitle}>{article.title}</h2>
            <p className={styles.cardDesc}>{article.description}</p>
            <div className={styles.cardMeta}>
              <span>{article.date}</span>
              <span>·</span>
              <span>{article.readTime}</span>
            </div>
            <span className={styles.cardLink}>Read Article →</span>
          </Link>
        ))}
      </div>

      <div className={styles.cta}>
        <h2>Ready to Create?</h2>
        <p>Try Image Nude free — 20 credits, no credit card required.</p>
        <Link href="/register" className={styles.ctaBtn}>Get Started Free →</Link>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Image Nude · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/content-policy">Content Policy</Link> · 18+ Only</p>
      </footer>
    </div>
  );
}
