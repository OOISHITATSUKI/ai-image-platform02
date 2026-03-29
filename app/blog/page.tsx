'use client';

import Link from 'next/link';
import styles from './page.module.css';
import BlogNav from '@/components/blog/BlogNav';
import { useTranslation } from '@/lib/useTranslation';

const ARTICLES = [
  {
    slug: 'best-ai-undress-tools',
    title: 'I Tested 3 AI Undress Tools — Here\'s What Actually Works (2026)',
    description: 'I signed up, paid, and tested SoulGen, Promptchan AI, and Undress.app myself. Honest comparison of features, pricing, and quality.',
    tag: 'Review',
    date: 'March 2026',
    readTime: '7',
  },
  {
    slug: 'how-to-generate-nsfw-ai-images',
    title: 'How to Generate NSFW AI Images — What I Learned After 10,000+ Generations',
    description: 'Real tips from someone who built an AI image platform. What actually works, what doesn\'t, and the mistakes I made along the way.',
    tag: 'Guide',
    date: 'March 2026',
    readTime: '10',
  },
  {
    slug: 'ai-face-swap-adults',
    title: 'AI Face Swap for Adults: Top Tools & How-To Guide (2025)',
    description: 'Complete guide to NSFW AI face swap tools. Compare top platforms, learn the process, and get tips for realistic results.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '7',
  },
  {
    slug: 'how-to-create-consistent-ai-character',
    title: 'How to Create a Consistent AI Character: Same Face, Unlimited Scenes (2025)',
    description: 'Learn how to create a consistent AI character and generate the same face across unlimited scenes. Step-by-step guide using face-saving technology.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '7',
  },
  {
    slug: 'ai-face-swap-vs-deepfake',
    title: 'AI Face Swap vs Deepfake: What\'s the Difference? (2025 Guide)',
    description: 'AI face swap and deepfake are not the same thing. Clear breakdown of the differences, how each works, and which one is right for your use case.',
    tag: 'Explainer',
    date: 'March 2025',
    readTime: '8',
  },
  {
    slug: 'how-to-use-ai-face-swap-adults',
    title: 'How to Use AI Face Swap for Adults: Complete 2025 Guide',
    description: 'Step-by-step guide to using AI face swap for adult content. Tips for realistic results, best practices, and how to get started for free.',
    tag: 'How-To',
    date: 'March 2025',
    readTime: '9',
  },
  {
    slug: 'ai-portrait-generator-realistic-faces',
    title: 'Best AI Portrait Generator for Realistic Faces (2025)',
    description: 'Compare the top AI portrait generators for creating realistic faces. Detailed reviews, quality comparisons, and tips for photorealistic results.',
    tag: 'Review',
    date: 'March 2025',
    readTime: '8',
  },
  {
    slug: 'nsfw-ai-anime-generator',
    title: 'Best NSFW AI Anime Generator: Top Tools Compared (2025)',
    description: 'Compare the best NSFW AI anime generators. Detailed reviews of tools, features, and tips for creating high-quality anime-style AI art.',
    tag: 'Review',
    date: 'March 2025',
    readTime: '8',
  },
  {
    slug: 'stable-diffusion-nsfw-guide',
    title: 'Stable Diffusion NSFW Guide: Models, Settings & Tips (2025)',
    description: 'Complete guide to using Stable Diffusion for NSFW content. Best models, optimal settings, and prompting tips for realistic results.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '9',
  },
  {
    slug: 'how-to-write-nsfw-ai-prompts',
    title: 'How to Write NSFW AI Prompts: Tips for Better Results (2025)',
    description: 'Master the art of writing NSFW AI prompts. Learn prompt structure, quality tags, negative prompts, and advanced techniques.',
    tag: 'Guide',
    date: 'March 2025',
    readTime: '8',
  },
];

export default function BlogIndexPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <BlogNav />

      <div className={styles.hero}>
        <span className={styles.label}>{t('blog.index.heroLabel')}</span>
        <h1 className={styles.heading}>
          {t('blog.index.heroTitle')}<br />
          <span className={styles.accent}>{t('blog.index.heroAccent')}</span>
        </h1>
        <p className={styles.subtext}>{t('blog.index.heroSubtext')}</p>
      </div>

      <div className={styles.grid}>
        {ARTICLES.map((article) => (
          <Link key={article.slug} href={`/blog/${article.slug}`} className={styles.card}>
            <div className={styles.cardTag}>{t(`blog.tags.${article.tag}`)}</div>
            <h2 className={styles.cardTitle}>{article.title}</h2>
            <p className={styles.cardDesc}>{article.description}</p>
            <div className={styles.cardMeta}>
              <span>{article.date}</span>
              <span>·</span>
              <span>{article.readTime} {t('blog.article.minRead')}</span>
            </div>
            <span className={styles.cardLink}>{t('blog.index.readArticle')}</span>
          </Link>
        ))}
      </div>

      <div className={styles.cta}>
        <h2>{t('blog.index.ctaHeading')}</h2>
        <p>{t('blog.index.ctaText')}</p>
        <Link href="/register" className={styles.ctaBtn}>{t('blog.index.ctaBtn')}</Link>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Image Nude · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/content-policy">Content Policy</Link> · 18+ Only</p>
      </footer>
    </div>
  );
}
