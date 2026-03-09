import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './FaqSection';

export const metadata: Metadata = {
  title: 'AI Undress Tool – Realistic Nude Image Generator | Image Nude',
  description: 'The most advanced AI undress tool online. Remove clothing from any photo instantly. Free to try – 20 credits on sign up.',
  alternates: { canonical: 'https://imagenude.com/undress-ai' },
  openGraph: {
    title: 'AI Undress Tool – Realistic Results in Seconds',
    description: 'Advanced AI that removes clothing from photos with photorealistic quality. Try free today.',
    url: 'https://imagenude.com/undress-ai',
  },
};

const ldJson = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Image Nude – AI Undress Tool',
  applicationCategory: 'MultimediaApplication',
  description: 'AI-powered image editing tool that generates realistic nude versions of uploaded photos.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free trial available',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.7',
    reviewCount: '2841',
  },
};

export default function UndressAiPage() {
  return (
    <>
      <Script
        id="ld-json-undress"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <div className={styles['lp-root']}>
        {/* Nav */}
        <nav className={styles['lp-nav']}>
          <Link href="/" className={styles['lp-logo']}>Image Nude</Link>
          <Link href="/register" className={styles['lp-nav-cta']}>Try Free &rarr;</Link>
        </nav>

        {/* Hero */}
        <section className={styles['lp-hero']}>
          <div className={styles['lp-hero-bg']} />
          <div className={styles['lp-hero-grid']} />
          <div className={styles['lp-hero-inner']}>
            <div>
              <div className={styles['lp-badge']}>
                <span className={styles['lp-badge-dot']} />
                #1 AI Undress Tool Online
              </div>
              <h1 className={styles['lp-h1']}>
                Remove Clothing<br />with <span className={styles['lp-h1-accent']}>AI Precision</span>
              </h1>
              <p className={styles['lp-hero-desc']}>
                Upload any photo and let our advanced AI generate a photorealistic nude version in seconds.
                No technical skills needed — just upload, paint, and generate.
              </p>
              <div className={styles['lp-cta-group']}>
                <Link href="/register" className={styles['lp-btn-primary']}>&#x2726; Try for Free</Link>
                <a href="#how-it-works" className={styles['lp-btn-secondary']}>See How It Works</a>
              </div>
              <p className={styles['lp-trust-line']}>
                &#x2B50; Rated <span className={styles['lp-trust-gold']}>4.7/5</span> by 2,841 users &nbsp;&middot;&nbsp; &#x1F512; 100% Private &nbsp;&middot;&nbsp; &#x1F381; 20 Free Credits on Sign Up
              </p>
            </div>

            <div className={styles['lp-hero-visual']}>
              <div className={styles['lp-before-after']}>
                <span className={styles['lp-ba-label']}>Before</span>
                <span className={`${styles['lp-ba-label']} ${styles['lp-ba-after-label']}`}>After</span>
                <div className={styles['lp-ba-images']}>
                  <div className={`${styles['lp-ba-img']} ${styles['lp-ba-img-before']}`}>
                    <div className={`${styles['lp-figure']} ${styles['lp-figure-before']}`} />
                  </div>
                  <div className={`${styles['lp-ba-img']} ${styles['lp-ba-img-after']}`}>
                    <div className={`${styles['lp-figure']} ${styles['lp-figure-after']}`} />
                  </div>
                </div>
                <div className={styles['lp-divider-line']}>
                  <div className={styles['lp-divider-handle']}>&harr;</div>
                </div>
                <div className={styles['lp-processing-badge']}>
                  <div className={styles['lp-spinner']} />
                  Generating realistic result...
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className={styles['lp-stats-strip']}>
          <div className={styles['lp-stats-inner']}>
            <div><div className={styles['lp-stat-num']}>2.4M+</div><div className={styles['lp-stat-label']}>Images Generated</div></div>
            <div><div className={styles['lp-stat-num']}>180K+</div><div className={styles['lp-stat-label']}>Active Users</div></div>
            <div><div className={styles['lp-stat-num']}>4.7&#x2605;</div><div className={styles['lp-stat-label']}>Average Rating</div></div>
            <div><div className={styles['lp-stat-num']}>8s</div><div className={styles['lp-stat-label']}>Avg. Generation Time</div></div>
          </div>
        </div>

        {/* How It Works */}
        <section id="how-it-works" className={styles['lp-section']}>
          <div className={styles['lp-section-inner']}>
            <div className={styles['lp-section-tag']}>How It Works</div>
            <h2 className={styles['lp-h2']}>Three steps to<br />photorealistic results</h2>
            <p className={styles['lp-section-sub']}>No technical knowledge required. Our AI does the hard work for you.</p>

            <div className={styles['lp-steps']}>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x1F4E4;</div>
                <h3>Upload Your Photo</h3>
                <p>Upload any portrait photo. Our AI works best with clear, well-lit photos. Supports JPG, PNG, and WebP up to 10MB.</p>
              </div>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x1F3A8;</div>
                <h3>Paint the Area</h3>
                <p>Use our intuitive brush tool to paint over the clothing areas you want removed. You control exactly what gets processed.</p>
              </div>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x2728;</div>
                <h3>Generate &amp; Download</h3>
                <p>Hit generate and receive your photorealistic result in under 10 seconds. Download in full resolution instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className={`${styles['lp-section']} ${styles['lp-features-bg']}`}>
          <div className={styles['lp-section-inner']}>
            <div className={styles['lp-section-tag']}>Features</div>
            <h2 className={styles['lp-h2']}>Why Image Nude is different</h2>
            <p className={styles['lp-section-sub']}>Built for quality. Designed for ease of use.</p>

            <div className={styles['lp-features-grid']}>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F52C;</div>
                <h3>Photorealistic AI Engine</h3>
                <p>Powered by the latest SDXL models with custom fine-tuning for anatomy accuracy. Results that look genuinely realistic, not obviously AI-generated.</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F3AD;</div>
                <h3>Full Body Control</h3>
                <p>Adjust body type, skin tone, age, and style with simple preset controls. Create exactly the result you envision.</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F512;</div>
                <h3>Complete Privacy</h3>
                <p>All images are automatically deleted within 1 hour of generation. No images are stored, shared, or used for training. Your sessions are fully private.</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x26A1;</div>
                <h3>Lightning Fast</h3>
                <p>Average generation time of 8 seconds. Built on dedicated GPU infrastructure for consistent performance even during peak hours.</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F4B0;</div>
                <h3>Free to Start</h3>
                <p>Get 20 free credits on signup — enough to generate 4 high-quality images. No credit card required to start.</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F310;</div>
                <h3>Crypto Payments Accepted</h3>
                <p>Pay anonymously with Bitcoin, Ethereum, USDT and 50+ cryptocurrencies. Maximum privacy for sensitive purchases.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className={styles['lp-section']}>
          <div className={styles['lp-section-inner']} style={{ textAlign: 'center' }}>
            <div className={styles['lp-section-tag']}>Pricing</div>
            <h2 className={styles['lp-h2']}>Simple, transparent pricing</h2>
            <p className={styles['lp-section-sub']} style={{ margin: '0 auto 60px' }}>Start free. Upgrade when you&apos;re ready.</p>

            <div className={styles['lp-pricing-grid']}>
              <div className={styles['lp-plan']}>
                <div className={styles['lp-plan-name']}>Starter</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>0</div>
                <div className={styles['lp-plan-price-note']}>Free forever</div>
                <ul className={styles['lp-plan-features']}>
                  <li>20 credits on signup</li>
                  <li>Standard quality output</li>
                  <li>720p resolution</li>
                  <li>Basic body presets</li>
                </ul>
                <Link href="/register" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-secondary']}`}>Get Started Free</Link>
              </div>

              <div className={`${styles['lp-plan']} ${styles['lp-plan-popular']}`}>
                <div className={styles['lp-popular-badge']}>Most Popular</div>
                <div className={styles['lp-plan-name']}>Basic</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>14<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['lp-plan-price-note']}>100 credits</div>
                <ul className={styles['lp-plan-features']}>
                  <li>100 generation credits</li>
                  <li>HD quality output</li>
                  <li>1080p resolution</li>
                  <li>All body presets</li>
                  <li>Priority generation queue</li>
                </ul>
                <Link href="/pricing" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-primary']}`}>Get Basic</Link>
              </div>

              <div className={styles['lp-plan']}>
                <div className={styles['lp-plan-name']}>Unlimited</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>29<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['lp-plan-price-note']}>300 credits</div>
                <ul className={styles['lp-plan-features']}>
                  <li>300 generation credits</li>
                  <li>Ultra HD quality</li>
                  <li>Max resolution output</li>
                  <li>All features unlocked</li>
                  <li>Fastest priority queue</li>
                  <li>Early access to new features</li>
                </ul>
                <Link href="/pricing" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-secondary']}`}>Get Unlimited</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FaqSection />

        {/* Bottom CTA */}
        <section className={`${styles['lp-section']} ${styles['lp-cta-section']}`}>
          <div className={styles['lp-section-inner']} style={{ textAlign: 'center' }}>
            <h2 className={styles['lp-h2']}>Ready to try it yourself?</h2>
            <p className={styles['lp-section-sub']} style={{ margin: '0 auto 40px' }}>Join 180,000+ users. Start for free — no credit card needed.</p>
            <Link href="/register" className={styles['lp-btn-primary']} style={{ fontSize: 18, padding: '20px 48px' }}>
              &#x2726; Start Free — 20 Credits Included
            </Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#444444' }}>18+ only &middot; All images AI-generated &middot; Images deleted within 1 hour</p>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles['lp-footer']}>
          <div className={styles['lp-footer-links']}>
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/face-swap">Face Swap</Link>
            <Link href="/blog/best-ai-undress-tools">Blog</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/2257">2257 Statement</Link>
          </div>
          <p className={styles['lp-footer-note']}>
            Image Nude is an AI-powered image generation platform. All generated images are fictional and AI-created.
            This service is intended for adults aged 18 and over. Generating content depicting minors or real individuals without consent is strictly prohibited.
            &copy; 2025 Image Nude. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
