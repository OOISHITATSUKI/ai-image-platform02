import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './FaqSection';

export const metadata: Metadata = {
  title: 'AI Face Swap Tool – Realistic Face Replacement | Image Nude',
  description: 'The most advanced AI face swap tool online. Swap any face into any photo with photorealistic accuracy. Free to try – 20 credits on sign up.',
  alternates: { canonical: 'https://imagenude.com/face-swap' },
  openGraph: {
    title: 'AI Face Swap Tool – Realistic Results in Seconds',
    description: 'Advanced AI face swap that blends faces seamlessly into any photo. Try free today.',
    url: 'https://imagenude.com/face-swap',
  },
};

const ldJson = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Image Nude – AI Face Swap Tool',
  applicationCategory: 'MultimediaApplication',
  description: 'AI-powered face swap tool that seamlessly replaces faces in any photo with photorealistic accuracy.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free trial available',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1964',
  },
};

export default function FaceSwapPage() {
  return (
    <>
      <Script
        id="ld-json-faceswap"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <div className={styles['fs-root']}>
        {/* Nav */}
        <nav className={styles['fs-nav']}>
          <div className={styles['fs-nav-inner']}>
            <Link href="/" className={styles['fs-logo']}>
              <span className={styles['fs-logo-icon']}>N</span>
              <span>ImageNude</span>
            </Link>
            <div className={styles['fs-nav-links']}>
              <Link href="/undress-ai">AI Undress</Link>
              <Link href="/blog/ai-face-swap-adults">Blog</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/register" className={styles['fs-nav-cta']}>Get Started Free</Link>
            </div>
          </div>
        </nav>

        {/* Hero — 2 column */}
        <section className={styles['fs-hero']}>
          <div className={styles['fs-hero-glow']} />
          <div className={styles['fs-container']}>
            <div className={styles['fs-hero-grid']}>
              {/* Left: text */}
              <div>
                <div className={styles['fs-hero-eyebrow']}>
                  <span className={styles['fs-eyebrow-dot']} />
                  #1 AI Face Swap Tool Online
                </div>
                <h1 className={styles['fs-h1']}>
                  AI Face Swap<br />
                  <span className={styles['fs-accent']}>Tool</span>
                </h1>
                <p className={styles['fs-hero-desc']}>
                  Swap any face into any image with photorealistic accuracy. Advanced AI blending
                  for seamless, natural-looking results — even in adult content.
                </p>
                <div className={styles['fs-hero-actions']}>
                  <Link href="/register" className={styles['fs-btn-primary']}>
                    &#x2726; Try for Free
                  </Link>
                  <a href="#how-it-works" className={styles['fs-btn-ghost']}>See How It Works</a>
                </div>
                <div className={styles['fs-social-proof']}>
                  <div className={styles['fs-avatars']}>
                    <div className={styles['fs-avatar']}>A</div>
                    <div className={styles['fs-avatar']}>B</div>
                    <div className={styles['fs-avatar']}>C</div>
                    <div className={styles['fs-avatar']}>D</div>
                  </div>
                  <span className={styles['fs-social-stars']}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span>Rated 4.8/5 by 1,964 users</span>
                </div>
              </div>

              {/* Right: demo card */}
              <div className={styles['fs-demo-card']}>
                <div className={styles['fs-demo-titlebar']}>
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-r']}`} />
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-y']}`} />
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-g']}`} />
                  <span>face-swap.app</span>
                </div>
                <div className={styles['fs-demo-body']}>
                  <div className={styles['fs-demo-label']}>Upload images</div>
                  <div className={styles['fs-demo-uploads']}>
                    <div className={styles['fs-demo-upload-slot']}>
                      <div className={styles['fs-demo-upload-icon']}>&#x1F5BC;</div>
                      <div className={styles['fs-demo-upload-text']}>Body Image</div>
                      <div className={styles['fs-demo-upload-sub']}>Target photo</div>
                    </div>
                    <div className={styles['fs-demo-upload-slot']}>
                      <div className={styles['fs-demo-upload-icon']}>&#x1F464;</div>
                      <div className={styles['fs-demo-upload-text']}>Face Image</div>
                      <div className={styles['fs-demo-upload-sub']}>Source face</div>
                    </div>
                  </div>
                  <button className={styles['fs-demo-generate']}>&#x2728; Generate Face Swap</button>
                  <div className={styles['fs-demo-meta']}>
                    <span>&#x26A1; ~8s processing</span>
                    <span>&#x1F512; Auto-delete in 1hr</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — Timeline */}
        <section id="how-it-works" className={styles['fs-section']}>
          <div className={styles['fs-container']}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>How It Works</span>
              <h2 className={styles['fs-h2']}>Three simple steps to<br /><span className={styles['fs-accent']}>perfect results</span></h2>
              <p className={styles['fs-subtext']}>No technical skills required. Upload, swap, download.</p>
            </div>
            <div className={styles['fs-timeline']}>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>1</div>
                <h3>Upload Base Image</h3>
                <p>Choose the target image where you want the face to appear. Any pose, any scene — our AI handles it all.</p>
              </div>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>2</div>
                <h3>Upload Face Photo</h3>
                <p>Provide a clear face photo. Front-facing works best for maximum accuracy. Supports JPG, PNG, and WebP.</p>
              </div>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>3</div>
                <h3>Swap &amp; Download</h3>
                <p>Hit generate and the AI blends the face seamlessly in seconds. Download your result in full HD resolution.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className={`${styles['fs-section']} ${styles['fs-section-alt']}`}>
          <div className={styles['fs-container']}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>Use Cases</span>
              <h2 className={styles['fs-h2']}>What you can <span className={styles['fs-accent']}>create</span></h2>
            </div>
            <div className={styles['fs-usecases']}>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>01</div>
                <h3>Fantasy Scenarios</h3>
                <p>Place any face into creative, imaginative scenes and scenarios. Build the exact visuals you have in mind.</p>
              </div>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>02</div>
                <h3>Character Creation</h3>
                <p>Build unique characters by combining different face and body references. Maintain consistent identity across images.</p>
              </div>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>03</div>
                <h3>Content Creation</h3>
                <p>Create personalized adult content with consistent face identity. Perfect for creators who need varied scenes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className={styles['fs-section']}>
          <div className={styles['fs-container']}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>Comparison</span>
              <h2 className={styles['fs-h2']}>How we <span className={styles['fs-accent']}>compare</span></h2>
              <p className={styles['fs-subtext']}>See why Image Nude is the top choice for AI face swap.</p>
            </div>
            <div className={styles['fs-table-wrap']}>
              <table className={styles['fs-table']}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Image Nude</th>
                    <th>SoulGen</th>
                    <th>Promptchan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles['fs-table-highlight']}>
                    <td>NSFW Face Swap</td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                  </tr>
                  <tr>
                    <td>Processing Speed</td>
                    <td><span className={styles['fs-check']}>&lt;10s</span></td>
                    <td>15-30s</td>
                    <td>20-45s</td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>Free Credits</td>
                    <td><span className={styles['fs-check']}>20</span></td>
                    <td>5</td>
                    <td>3</td>
                  </tr>
                  <tr>
                    <td>Auto-Delete Images</td>
                    <td><span className={styles['fs-check']}>1 hour</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>Crypto Payments</td>
                    <td><span className={styles['fs-check']}>50+</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                  </tr>
                  <tr>
                    <td>HD Output</td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td>SD only</td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>User Rating</td>
                    <td><span className={styles['fs-check']}>4.8&#9733;</span></td>
                    <td>4.3&#9733;</td>
                    <td>3.9&#9733;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className={`${styles['fs-section']} ${styles['fs-section-alt']}`}>
          <div className={styles['fs-container']} style={{ textAlign: 'center' }}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>Pricing</span>
              <h2 className={styles['fs-h2']}>Simple, transparent <span className={styles['fs-accent']}>pricing</span></h2>
              <p className={styles['fs-subtext']}>Start free. Upgrade when you&apos;re ready.</p>
            </div>
            <div className={styles['fs-pricing-grid']}>
              <div className={styles['fs-plan']}>
                <div className={styles['fs-plan-name']}>Free</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>0</div>
                <div className={styles['fs-plan-price-note']}>Free forever</div>
                <ul className={styles['fs-plan-features']}>
                  <li>20 credits on signup</li>
                  <li>Standard quality output</li>
                  <li>720p resolution</li>
                  <li>10 face swaps included</li>
                </ul>
                <Link href="/register" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-secondary']}`}>Get Started Free</Link>
              </div>

              <div className={`${styles['fs-plan']} ${styles['fs-plan-popular']}`}>
                <div className={styles['fs-popular-badge']}>Most Popular</div>
                <div className={styles['fs-plan-name']}>Basic</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>14<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['fs-plan-price-note']}>100 credits</div>
                <ul className={styles['fs-plan-features']}>
                  <li>100 generation credits</li>
                  <li>HD quality output</li>
                  <li>1080p resolution</li>
                  <li>50 face swaps</li>
                  <li>Priority queue</li>
                </ul>
                <Link href="/pricing" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-primary']}`}>Get Basic</Link>
              </div>

              <div className={styles['fs-plan']}>
                <div className={styles['fs-plan-name']}>Unlimited</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>29<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['fs-plan-price-note']}>300 credits</div>
                <ul className={styles['fs-plan-features']}>
                  <li>300 generation credits</li>
                  <li>Ultra HD quality</li>
                  <li>Max resolution output</li>
                  <li>150 face swaps</li>
                  <li>Fastest priority queue</li>
                  <li>Early access to new features</li>
                </ul>
                <Link href="/pricing" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-secondary']}`}>Get Unlimited</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FaqSection />

        {/* Bottom CTA */}
        <section className={styles['fs-cta-section']}>
          <div className={styles['fs-cta-glow']} />
          <div className={styles['fs-container']} style={{ position: 'relative', zIndex: 1 }}>
            <h2 className={styles['fs-cta-heading']}>
              Ready to try the best<br /><span className={styles['fs-accent']}>AI Face Swap Tool?</span>
            </h2>
            <p className={styles['fs-subtext']} style={{ marginBottom: 40 }}>
              Join 180,000+ users. Start for free — no credit card needed.
            </p>
            <Link href="/register" className={styles['fs-btn-primary']} style={{ fontSize: 18, padding: '20px 48px' }}>
              &#x2726; Start Free — 20 Credits Included
            </Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#444444' }}>18+ only &middot; All images AI-generated &middot; Images deleted within 1 hour</p>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles['fs-footer']}>
          <div className={styles['fs-footer-inner']}>
            <div className={styles['fs-footer-brand']}>
              <div className={styles['fs-logo']}>
                <span className={styles['fs-logo-icon']}>N</span>
                <span>ImageNude</span>
              </div>
              <p>AI-powered image generation platform.</p>
            </div>
            <div className={styles['fs-footer-links']}>
              <div>
                <h4>Tools</h4>
                <Link href="/undress-ai">AI Undress</Link>
                <Link href="/face-swap">Face Swap</Link>
                <Link href="/editor">Editor</Link>
              </div>
              <div>
                <h4>Blog</h4>
                <Link href="/blog/best-ai-undress-tools">Best AI Undress Tools</Link>
                <Link href="/blog/how-to-generate-nsfw-ai-images">NSFW AI Guide</Link>
                <Link href="/blog/ai-face-swap-adults">Face Swap Guide</Link>
              </div>
              <div>
                <h4>Legal</h4>
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/2257">2257 Statement</Link>
              </div>
            </div>
          </div>
          <div className={styles['fs-footer-bottom']}>
            <p className={styles['fs-footer-note']}>
              Image Nude is an AI-powered image generation platform. All generated images are fictional and AI-created.
              This service is intended for adults aged 18 and over. Generating content depicting minors or real individuals without consent is strictly prohibited.
              &copy; 2025 Image Nude. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
