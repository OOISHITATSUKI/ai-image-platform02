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
  const { t } = useTranslation();

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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <LangSelector />
            <Link href="/register" className={styles['lp-nav-cta']}>{t('undressLp.nav.tryFree')} &rarr;</Link>
          </div>
        </nav>

        {/* Hero */}
        <section className={styles['lp-hero']}>
          <div className={styles['lp-hero-bg']} />
          <div className={styles['lp-hero-grid']} />
          <div className={styles['lp-hero-inner']}>
            <div>
              <div className={styles['lp-badge']}>
                <span className={styles['lp-badge-dot']} />
                {t('undressLp.hero.badge')}
              </div>
              <h1 className={styles['lp-h1']}>
                {t('undressLp.hero.h1')}<br /><span className={styles['lp-h1-accent']}>{t('undressLp.hero.h1Accent')}</span>
              </h1>
              <p className={styles['lp-hero-desc']}>
                {t('undressLp.hero.desc')}
              </p>
              <p className={styles['lp-trust-badges']} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: 14, color: '#10b981', fontWeight: 600, margin: '12px 0 20px' }}>
                <span>&#x2713; {t('undressLp.hero.trustFree')}</span>
                <span>&#x2713; {t('undressLp.hero.trustNoAccount')}</span>
                <span>&#x2713; {t('undressLp.hero.trustSpeed')}</span>
              </p>
              <div className={styles['lp-cta-group']}>
                <Link href="/register" className={styles['lp-btn-primary']}>&#x2726; {t('undressLp.hero.tryFree')}</Link>
                <a href="#how-it-works" className={styles['lp-btn-secondary']}>{t('undressLp.hero.seeHow')}</a>
              </div>
              <p className={styles['lp-trust-line']}>
                &#x2B50; {t('undressLp.hero.trustLine')} <span className={styles['lp-trust-gold']}>{t('undressLp.hero.trustRating')}</span> {t('undressLp.hero.trustByUsers')} &nbsp;&middot;&nbsp; &#x1F512; {t('undressLp.hero.trustPrivate')} &nbsp;&middot;&nbsp; &#x1F381; {t('undressLp.hero.trustCredits')}
              </p>
            </div>

            <div className={styles['lp-hero-visual']}>
              <div className={styles['lp-before-after']}>
                <span className={styles['lp-ba-label']}>{t('undressLp.beforeAfter.before')}</span>
                <span className={`${styles['lp-ba-label']} ${styles['lp-ba-after-label']}`}>{t('undressLp.beforeAfter.after')}</span>
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
                  {t('undressLp.beforeAfter.processing')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className={styles['lp-stats-strip']}>
          <div className={styles['lp-stats-inner']}>
            <div><div className={styles['lp-stat-num']}>{t('undressLp.stats.images')}</div><div className={styles['lp-stat-label']}>{t('undressLp.stats.imagesLabel')}</div></div>
            <div><div className={styles['lp-stat-num']}>{t('undressLp.stats.users')}</div><div className={styles['lp-stat-label']}>{t('undressLp.stats.usersLabel')}</div></div>
            <div><div className={styles['lp-stat-num']}>{t('undressLp.stats.rating')}</div><div className={styles['lp-stat-label']}>{t('undressLp.stats.ratingLabel')}</div></div>
            <div><div className={styles['lp-stat-num']}>{t('undressLp.stats.speed')}</div><div className={styles['lp-stat-label']}>{t('undressLp.stats.speedLabel')}</div></div>
          </div>
        </div>

        {/* How It Works */}
        <section id="how-it-works" className={styles['lp-section']}>
          <div className={styles['lp-section-inner']}>
            <div className={styles['lp-section-tag']}>{t('undressLp.howItWorks.label')}</div>
            <h2 className={styles['lp-h2']}>{t('undressLp.howItWorks.h2')}<br />{t('undressLp.howItWorks.h2Sub')}</h2>
            <p className={styles['lp-section-sub']}>{t('undressLp.howItWorks.sub')}</p>

            <div className={styles['lp-steps']}>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x1F4E4;</div>
                <h3>{t('undressLp.howItWorks.step1Title')}</h3>
                <p>{t('undressLp.howItWorks.step1Desc')}</p>
              </div>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x1F3A8;</div>
                <h3>{t('undressLp.howItWorks.step2Title')}</h3>
                <p>{t('undressLp.howItWorks.step2Desc')}</p>
              </div>
              <div className={styles['lp-step']}>
                <div className={styles['lp-step-icon']}>&#x2728;</div>
                <h3>{t('undressLp.howItWorks.step3Title')}</h3>
                <p>{t('undressLp.howItWorks.step3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className={`${styles['lp-section']} ${styles['lp-features-bg']}`}>
          <div className={styles['lp-section-inner']}>
            <div className={styles['lp-section-tag']}>{t('undressLp.features.label')}</div>
            <h2 className={styles['lp-h2']}>{t('undressLp.features.h2')}</h2>
            <p className={styles['lp-section-sub']}>{t('undressLp.features.sub')}</p>

            <div className={styles['lp-features-grid']}>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F52C;</div>
                <h3>{t('undressLp.features.feat1Title')}</h3>
                <p>{t('undressLp.features.feat1Desc')}</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F3AD;</div>
                <h3>{t('undressLp.features.feat2Title')}</h3>
                <p>{t('undressLp.features.feat2Desc')}</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F512;</div>
                <h3>{t('undressLp.features.feat3Title')}</h3>
                <p>{t('undressLp.features.feat3Desc')}</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x26A1;</div>
                <h3>{t('undressLp.features.feat4Title')}</h3>
                <p>{t('undressLp.features.feat4Desc')}</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F4B0;</div>
                <h3>{t('undressLp.features.feat5Title')}</h3>
                <p>{t('undressLp.features.feat5Desc')}</p>
              </div>
              <div className={styles['lp-feature-card']}>
                <div className={styles['lp-feature-icon']}>&#x1F310;</div>
                <h3>{t('undressLp.features.feat6Title')}</h3>
                <p>{t('undressLp.features.feat6Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className={styles['lp-section']}>
          <div className={styles['lp-section-inner']} style={{ textAlign: 'center' }}>
            <div className={styles['lp-section-tag']}>{t('undressLp.pricing.label')}</div>
            <h2 className={styles['lp-h2']}>{t('undressLp.pricing.h2')}</h2>
            <p className={styles['lp-section-sub']} style={{ margin: '0 auto 60px' }}>{t('undressLp.pricing.sub')}</p>

            <div className={styles['lp-pricing-grid']}>
              <div className={styles['lp-plan']}>
                <div className={styles['lp-plan-name']}>{t('undressLp.pricing.starterName')}</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>0</div>
                <div className={styles['lp-plan-price-note']}>{t('undressLp.pricing.starterNote')}</div>
                <ul className={styles['lp-plan-features']}>
                  <li>{t('undressLp.pricing.starterFeat1')}</li>
                  <li>{t('undressLp.pricing.starterFeat2')}</li>
                  <li>{t('undressLp.pricing.starterFeat3')}</li>
                  <li>{t('undressLp.pricing.starterFeat4')}</li>
                </ul>
                <Link href="/register" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-secondary']}`}>{t('undressLp.pricing.starterBtn')}</Link>
              </div>

              <div className={`${styles['lp-plan']} ${styles['lp-plan-popular']}`}>
                <div className={styles['lp-popular-badge']}>{t('undressLp.pricing.mostPopular')}</div>
                <div className={styles['lp-plan-name']}>{t('undressLp.pricing.basicName')}</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>14<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['lp-plan-price-note']}>{t('undressLp.pricing.basicNote')}</div>
                <ul className={styles['lp-plan-features']}>
                  <li>{t('undressLp.pricing.basicFeat1')}</li>
                  <li>{t('undressLp.pricing.basicFeat2')}</li>
                  <li>{t('undressLp.pricing.basicFeat3')}</li>
                  <li>{t('undressLp.pricing.basicFeat4')}</li>
                  <li>{t('undressLp.pricing.basicFeat5')}</li>
                </ul>
                <Link href="/pricing" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-primary']}`}>{t('undressLp.pricing.basicBtn')}</Link>
              </div>

              <div className={styles['lp-plan']}>
                <div className={styles['lp-plan-name']}>{t('undressLp.pricing.unlimitedName')}</div>
                <div className={styles['lp-plan-price']}><sup>$</sup>29<span style={{ fontSize: 24 }}>.99</span></div>
                <div className={styles['lp-plan-price-note']}>{t('undressLp.pricing.unlimitedNote')}</div>
                <ul className={styles['lp-plan-features']}>
                  <li>{t('undressLp.pricing.unlimitedFeat1')}</li>
                  <li>{t('undressLp.pricing.unlimitedFeat2')}</li>
                  <li>{t('undressLp.pricing.unlimitedFeat3')}</li>
                  <li>{t('undressLp.pricing.unlimitedFeat4')}</li>
                  <li>{t('undressLp.pricing.unlimitedFeat5')}</li>
                  <li>{t('undressLp.pricing.unlimitedFeat6')}</li>
                </ul>
                <Link href="/pricing" className={`${styles['lp-plan-btn']} ${styles['lp-plan-btn-secondary']}`}>{t('undressLp.pricing.unlimitedBtn')}</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FaqSection />

        {/* Bottom CTA */}
        <section className={`${styles['lp-section']} ${styles['lp-cta-section']}`}>
          <div className={styles['lp-section-inner']} style={{ textAlign: 'center' }}>
            <h2 className={styles['lp-h2']}>{t('undressLp.cta.h2')}</h2>
            <p className={styles['lp-section-sub']} style={{ margin: '0 auto 40px' }}>{t('undressLp.cta.sub')}</p>
            <Link href="/register" className={styles['lp-btn-primary']} style={{ fontSize: 18, padding: '20px 48px' }}>
              &#x2726; {t('undressLp.cta.btn')}
            </Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#444444' }}>{t('undressLp.cta.note')}</p>
          </div>
        </section>

        {/* SEO Keyword Section */}
        <section className={styles['lp-section']}>
          <div className={styles['lp-section-inner']}>
            <h2 className={styles['lp-h2']}>{t('undressLp.seo.h2')}</h2>
            <p className={styles['lp-section-sub']} style={{ margin: '0 auto 24px', maxWidth: 640 }}>
              {t('undressLp.seo.desc')}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, maxWidth: 480, margin: '0 auto', textAlign: 'left', fontSize: 16, lineHeight: 2, color: '#ccc' }}>
              <li>&#x2713; {t('undressLp.seo.feat1')}</li>
              <li>&#x2713; {t('undressLp.seo.feat2')}</li>
              <li>&#x2713; {t('undressLp.seo.feat3')}</li>
              <li>&#x2713; {t('undressLp.seo.feat4')}</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles['lp-footer']}>
          <div className={styles['lp-footer-links']}>
            <Link href="/">{t('undressLp.footer.home')}</Link>
            <Link href="/pricing">{t('undressLp.footer.pricing')}</Link>
            <Link href="/face-swap">{t('undressLp.footer.faceSwap')}</Link>
            <Link href="/blog/best-ai-undress-tools">{t('undressLp.footer.blog')}</Link>
            <Link href="/privacy">{t('undressLp.footer.privacy')}</Link>
            <Link href="/terms">{t('undressLp.footer.terms')}</Link>
            <Link href="/2257">{t('undressLp.footer.statement')}</Link>
          </div>
          <p className={styles['lp-footer-note']}>
            {t('undressLp.footer.disclaimer')}
            {' '}{t('undressLp.footer.copyright')}
          </p>
        </footer>
      </div>
    </>
  );
}
