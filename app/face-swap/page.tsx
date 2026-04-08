'use client';

import Script from 'next/script';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './FaqSection';
import LangSelector from '@/components/blog/LangSelector';
import { useTranslation } from '@/lib/useTranslation';

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
  const { t } = useTranslation();

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
              <Link href="/undress-ai">{t('faceSwapLp.nav.aiUndress')}</Link>
              <Link href="/blog/ai-face-swap-adults">{t('faceSwapLp.nav.blog')}</Link>
              <Link href="/pricing">{t('faceSwapLp.nav.pricing')}</Link>
              <LangSelector />
              <Link href="/register" className={styles['fs-nav-cta']}>{t('faceSwapLp.nav.getStarted')}</Link>
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
                  {t('faceSwapLp.hero.eyebrow')}
                </div>
                <h1 className={styles['fs-h1']}>
                  {t('faceSwapLp.hero.h1')}<br />
                  <span className={styles['fs-accent']}>{t('faceSwapLp.hero.h1Accent')}</span>
                </h1>
                <p className={styles['fs-hero-desc']}>
                  {t('faceSwapLp.hero.desc')}
                </p>
                <p style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: 14, color: '#10b981', fontWeight: 600, margin: '12px 0 20px' }}>
                  <span>&#x2713; {t('faceSwapLp.hero.trustFree')}</span>
                  <span>&#x2713; {t('faceSwapLp.hero.trustNoReg')}</span>
                  <span>&#x2713; {t('faceSwapLp.hero.trustSpeed')}</span>
                </p>
                <div className={styles['fs-hero-actions']}>
                  <Link href="/register" className={styles['fs-btn-primary']}>
                    &#x2726; {t('faceSwapLp.hero.tryFree')}
                  </Link>
                  <a href="#how-it-works" className={styles['fs-btn-ghost']}>{t('faceSwapLp.hero.seeHow')}</a>
                </div>
                <div className={styles['fs-social-proof']}>
                  <div className={styles['fs-avatars']}>
                    <div className={styles['fs-avatar']}>A</div>
                    <div className={styles['fs-avatar']}>B</div>
                    <div className={styles['fs-avatar']}>C</div>
                    <div className={styles['fs-avatar']}>D</div>
                  </div>
                  <span className={styles['fs-social-stars']}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span>{t('faceSwapLp.hero.socialProof')}</span>
                </div>
              </div>

              {/* Right: demo card */}
              <div className={styles['fs-demo-card']}>
                <div className={styles['fs-demo-titlebar']}>
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-r']}`} />
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-y']}`} />
                  <div className={`${styles['fs-demo-dot']} ${styles['fs-demo-dot-g']}`} />
                  <span>{t('faceSwapLp.demo.title')}</span>
                </div>
                <div className={styles['fs-demo-body']}>
                  <div className={styles['fs-demo-label']}>{t('faceSwapLp.demo.uploadLabel')}</div>
                  <div className={styles['fs-demo-uploads']}>
                    <div className={styles['fs-demo-upload-slot']}>
                      <div className={styles['fs-demo-upload-icon']}>&#x1F5BC;</div>
                      <div className={styles['fs-demo-upload-text']}>{t('faceSwapLp.demo.bodyImage')}</div>
                      <div className={styles['fs-demo-upload-sub']}>{t('faceSwapLp.demo.bodyImageSub')}</div>
                    </div>
                    <div className={styles['fs-demo-upload-slot']}>
                      <div className={styles['fs-demo-upload-icon']}>&#x1F464;</div>
                      <div className={styles['fs-demo-upload-text']}>{t('faceSwapLp.demo.faceImage')}</div>
                      <div className={styles['fs-demo-upload-sub']}>{t('faceSwapLp.demo.faceImageSub')}</div>
                    </div>
                  </div>
                  <button className={styles['fs-demo-generate']}>&#x2728; {t('faceSwapLp.demo.generateBtn')}</button>
                  <div className={styles['fs-demo-meta']}>
                    <span>&#x26A1; {t('faceSwapLp.demo.processing')}</span>
                    <span>&#x1F512; {t('faceSwapLp.demo.autoDelete')}</span>
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
              <span className={styles['fs-label']}>{t('faceSwapLp.howItWorks.label')}</span>
              <h2 className={styles['fs-h2']}>{t('faceSwapLp.howItWorks.h2')}<br /><span className={styles['fs-accent']}>{t('faceSwapLp.howItWorks.h2Accent')}</span></h2>
              <p className={styles['fs-subtext']}>{t('faceSwapLp.howItWorks.sub')}</p>
            </div>
            <div className={styles['fs-timeline']}>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>1</div>
                <h3>{t('faceSwapLp.howItWorks.step1Title')}</h3>
                <p>{t('faceSwapLp.howItWorks.step1Desc')}</p>
              </div>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>2</div>
                <h3>{t('faceSwapLp.howItWorks.step2Title')}</h3>
                <p>{t('faceSwapLp.howItWorks.step2Desc')}</p>
              </div>
              <div className={styles['fs-timeline-step']}>
                <div className={styles['fs-timeline-num']}>3</div>
                <h3>{t('faceSwapLp.howItWorks.step3Title')}</h3>
                <p>{t('faceSwapLp.howItWorks.step3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className={`${styles['fs-section']} ${styles['fs-section-alt']}`}>
          <div className={styles['fs-container']}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>{t('faceSwapLp.useCases.label')}</span>
              <h2 className={styles['fs-h2']}>{t('faceSwapLp.useCases.h2')} <span className={styles['fs-accent']}>{t('faceSwapLp.useCases.h2Accent')}</span></h2>
            </div>
            <div className={styles['fs-usecases']}>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>01</div>
                <h3>{t('faceSwapLp.useCases.case1Title')}</h3>
                <p>{t('faceSwapLp.useCases.case1Desc')}</p>
              </div>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>02</div>
                <h3>{t('faceSwapLp.useCases.case2Title')}</h3>
                <p>{t('faceSwapLp.useCases.case2Desc')}</p>
              </div>
              <div className={styles['fs-usecase-card']}>
                <div className={styles['fs-usecase-num']}>03</div>
                <h3>{t('faceSwapLp.useCases.case3Title')}</h3>
                <p>{t('faceSwapLp.useCases.case3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className={styles['fs-section']}>
          <div className={styles['fs-container']}>
            <div className={styles['fs-section-header']}>
              <span className={styles['fs-label']}>{t('faceSwapLp.comparison.label')}</span>
              <h2 className={styles['fs-h2']}>{t('faceSwapLp.comparison.h2')} <span className={styles['fs-accent']}>{t('faceSwapLp.comparison.h2Accent')}</span></h2>
              <p className={styles['fs-subtext']}>{t('faceSwapLp.comparison.sub')}</p>
            </div>
            <div className={styles['fs-table-wrap']}>
              <table className={styles['fs-table']}>
                <thead>
                  <tr>
                    <th>{t('faceSwapLp.comparison.feature')}</th>
                    <th>{t('faceSwapLp.comparison.imageNude')}</th>
                    <th>{t('faceSwapLp.comparison.soulgen')}</th>
                    <th>{t('faceSwapLp.comparison.promptchan')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles['fs-table-highlight']}>
                    <td>{t('faceSwapLp.comparison.nsfwFaceSwap')}</td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                  </tr>
                  <tr>
                    <td>{t('faceSwapLp.comparison.processingSpeed')}</td>
                    <td><span className={styles['fs-check']}>&lt;10s</span></td>
                    <td>15-30s</td>
                    <td>20-45s</td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>{t('faceSwapLp.comparison.freeCredits')}</td>
                    <td><span className={styles['fs-check']}>20</span></td>
                    <td>5</td>
                    <td>3</td>
                  </tr>
                  <tr>
                    <td>{t('faceSwapLp.comparison.autoDeleteImages')}</td>
                    <td><span className={styles['fs-check']}>{t('faceSwapLp.comparison.hour1')}</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>{t('faceSwapLp.comparison.cryptoPayments')}</td>
                    <td><span className={styles['fs-check']}>50+</span></td>
                    <td><span className={styles['fs-cross']}>&#10007;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                  </tr>
                  <tr>
                    <td>{t('faceSwapLp.comparison.hdOutput')}</td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td><span className={styles['fs-check']}>&#10003;</span></td>
                    <td>{t('faceSwapLp.comparison.sdOnly')}</td>
                  </tr>
                  <tr className={styles['fs-table-highlight']}>
                    <td>{t('faceSwapLp.comparison.userRating')}</td>
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
              <span className={styles['fs-label']}>{t('faceSwapLp.pricing.label')}</span>
              <h2 className={styles['fs-h2']}>{t('faceSwapLp.pricing.h2')} <span className={styles['fs-accent']}>{t('faceSwapLp.pricing.h2Accent')}</span></h2>
              <p className={styles['fs-subtext']}>{t('faceSwapLp.pricing.sub')}</p>
            </div>
            <div className={styles['fs-pricing-grid']}>
              <div className={styles['fs-plan']}>
                <div className={styles['fs-plan-name']}>{t('faceSwapLp.pricing.freeName')}</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>0</div>
                <div className={styles['fs-plan-price-note']}>{t('faceSwapLp.pricing.freeForever')}</div>
                <ul className={styles['fs-plan-features']}>
                  <li>{t('faceSwapLp.pricing.freeFeature1')}</li>
                  <li>{t('faceSwapLp.pricing.freeFeature2')}</li>
                  <li>{t('faceSwapLp.pricing.freeFeature3')}</li>
                  <li>{t('faceSwapLp.pricing.freeFeature4')}</li>
                </ul>
                <Link href="/register" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-secondary']}`}>{t('faceSwapLp.pricing.getStartedFree')}</Link>
              </div>

              <div className={`${styles['fs-plan']} ${styles['fs-plan-popular']}`}>
                <div className={styles['fs-popular-badge']}>{t('faceSwapLp.pricing.mostPopular')}</div>
                <div className={styles['fs-plan-name']}>{t('faceSwapLp.pricing.basicName')}</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>14<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['fs-plan-price-note']}>{t('faceSwapLp.pricing.basicNote')}</div>
                <ul className={styles['fs-plan-features']}>
                  <li>{t('faceSwapLp.pricing.basicFeature1')}</li>
                  <li>{t('faceSwapLp.pricing.basicFeature2')}</li>
                  <li>{t('faceSwapLp.pricing.basicFeature3')}</li>
                  <li>{t('faceSwapLp.pricing.basicFeature4')}</li>
                  <li>{t('faceSwapLp.pricing.basicFeature5')}</li>
                </ul>
                <Link href="/pricing" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-primary']}`}>{t('faceSwapLp.pricing.getBasic')}</Link>
              </div>

              <div className={styles['fs-plan']}>
                <div className={styles['fs-plan-name']}>{t('faceSwapLp.pricing.unlimitedName')}</div>
                <div className={styles['fs-plan-price']}><sup>$</sup>29<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['fs-plan-price-note']}>{t('faceSwapLp.pricing.unlimitedNote')}</div>
                <ul className={styles['fs-plan-features']}>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature1')}</li>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature2')}</li>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature3')}</li>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature4')}</li>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature5')}</li>
                  <li>{t('faceSwapLp.pricing.unlimitedFeature6')}</li>
                </ul>
                <Link href="/pricing" className={`${styles['fs-plan-btn']} ${styles['fs-plan-btn-secondary']}`}>{t('faceSwapLp.pricing.getUnlimited')}</Link>
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
              {t('faceSwapLp.cta.h2')}<br /><span className={styles['fs-accent']}>{t('faceSwapLp.cta.h2Accent')}</span>
            </h2>
            <p className={styles['fs-subtext']} style={{ marginBottom: 40 }}>
              {t('faceSwapLp.cta.sub')}
            </p>
            <Link href="/register" className={styles['fs-btn-primary']} style={{ fontSize: 18, padding: '20px 48px' }}>
              &#x2726; {t('faceSwapLp.cta.btn')}
            </Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#444444' }}>{t('faceSwapLp.cta.disclaimer')}</p>
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
              <p>{t('faceSwapLp.footer.tagline')}</p>
            </div>
            <div className={styles['fs-footer-links']}>
              <div>
                <h4>{t('faceSwapLp.footer.tools')}</h4>
                <Link href="/undress-ai">{t('faceSwapLp.footer.aiUndress')}</Link>
                <Link href="/face-swap">{t('faceSwapLp.footer.faceSwap')}</Link>
                <Link href="/editor">{t('faceSwapLp.footer.editor')}</Link>
              </div>
              <div>
                <h4>{t('faceSwapLp.footer.blog')}</h4>
                <Link href="/blog/best-ai-undress-tools">{t('faceSwapLp.footer.bestAiUndress')}</Link>
                <Link href="/blog/how-to-generate-nsfw-ai-images">{t('faceSwapLp.footer.nsfwGuide')}</Link>
                <Link href="/blog/ai-face-swap-adults">{t('faceSwapLp.footer.faceSwapGuide')}</Link>
              </div>
              <div>
                <h4>{t('faceSwapLp.footer.legal')}</h4>
                <Link href="/terms">{t('faceSwapLp.footer.terms')}</Link>
                <Link href="/privacy">{t('faceSwapLp.footer.privacy')}</Link>
                <Link href="/2257">{t('faceSwapLp.footer.statement2257')}</Link>
              </div>
            </div>
          </div>
          <div className={styles['fs-footer-bottom']}>
            <p className={styles['fs-footer-note']}>
              {t('faceSwapLp.footer.disclaimer')}
              {' '}&copy; 2025 Image Nude. {t('faceSwapLp.footer.copyright')}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
