'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

const STATS = [
    { value: '50K+', label: 'Images Created' },
    { value: '4.8', label: 'User Rating' },
    { value: '<10s', label: 'Generation Time' },
    { value: '100%', label: 'Private & Secure' },
];
const REVIEWS = [
    { name: 'Alex K.', rating: 5, text: "Incredible quality. Better than any other AI generator I've tried.", avatar: 'A', color: '#dc2626' },
    { name: 'Miku T.', rating: 5, text: 'The anime style is absolutely stunning. Love the tag system.', avatar: 'M', color: '#7c3aed' },
    { name: 'Carlos R.', rating: 4, text: 'Fast generation, great results. Video feature is a game changer.', avatar: 'C', color: '#0891b2' },
    { name: 'Sarah L.', rating: 5, text: 'So easy to use. Created exactly what I imagined in seconds.', avatar: 'S', color: '#ca8a04' },
];
const FEATURES = [
    { icon: '✦', title: 'Text to Image', desc: 'Describe your vision. AI creates it.' },
    { icon: '◈', title: 'Face Swap', desc: 'Blend faces seamlessly into any scene.' },
    { icon: '▶', title: 'AI Video', desc: 'Bring your images to life with motion.' },
];
const SAMPLE_IMAGES = [
    { prompt: 'Elegant portrait, golden hour', style: 'Realistic' },
    { prompt: 'Fantasy warrior queen', style: 'Anime' },
    { prompt: 'Beach sunset scene', style: 'Realistic' },
    { prompt: 'Cyberpunk city girl', style: 'Digital Art' },
    { prompt: 'Classical painting style', style: 'Art' },
    { prompt: 'Fashion editorial look', style: 'Realistic' },
    { prompt: 'Neon nightlife portrait', style: 'Digital Art' },
    { prompt: 'Ethereal forest fairy', style: 'Anime' },
];

function StarRating({ count }: { count: number }) {
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ color: i < count ? '#f59e0b' : '#333', fontSize: 14 }}>★</span>
            ))}
        </div>
    );
}

function TryItNowSection() {
    return (
        <section className="hp-section hp-section-pad">
            <div className="hp-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 500, background: 'radial-gradient(circle, rgba(220,38,38,0.06), transparent 70%)' }} />
            <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div className="hp-label"><span className="hp-pulse">●</span> Free to Try — No Sign Up Required</div>
                    <h2 className="hp-heading">Try It <span className="hp-accent-text">Free</span></h2>
                    <p className="hp-subtext" style={{ maxWidth: 520, margin: '0 auto' }}>Generate AI images instantly. No account needed. All features available.</p>
                </div>
                <div className="hp-demo-card">
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 20 }}>⚡</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#fff' }}>Full Editor — Free Access</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28, fontSize: 14, color: '#aaa' }}>
                            <span>Text to Image — describe anything</span>
                            <span>Undress AI — upload & transform</span>
                            <span>Face Swap — swap faces instantly</span>
                            <span>AI Video — bring images to life</span>
                        </div>
                        <Link href="/" className="hp-btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '18px', gap: 8, display: 'inline-flex' }}>
                            Open Editor — Start Free
                        </Link>
                        <div className="hp-trust-row" style={{ justifyContent: 'center', fontSize: 12, color: '#444', marginTop: 16 }}>
                            <span>No sign up</span>
                            <span>~10 seconds</span>
                            <span>100% private</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function BeforeAfterSlider() {
    const containerRef = useRef<HTMLDivElement>(null);
    const beforeRef = useRef<HTMLDivElement>(null);
    const beforeImgRef = useRef<HTMLImageElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const c = containerRef.current;
        if (!c) return;
        // Set before image width to match container
        const setImgWidth = () => {
            if (beforeImgRef.current) beforeImgRef.current.style.width = `${c.offsetWidth}px`;
        };
        setImgWidth();
        const ro = new ResizeObserver(setImgWidth);
        ro.observe(c);

        let raf = 0;
        const apply = (pct: number) => {
            if (beforeRef.current) beforeRef.current.style.width = `${pct}%`;
            if (lineRef.current) lineRef.current.style.left = `${pct}%`;
            if (handleRef.current) handleRef.current.style.left = `${pct}%`;
        };
        const update = (cx: number) => {
            const r = c.getBoundingClientRect();
            const pct = Math.max(2, Math.min(98, ((cx - r.left) / r.width) * 100));
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => apply(pct));
        };
        const down = (e: PointerEvent) => { isDragging.current = true; c.setPointerCapture(e.pointerId); update(e.clientX); };
        const move = (e: PointerEvent) => { if (!isDragging.current) return; e.preventDefault(); update(e.clientX); };
        const up = () => { isDragging.current = false; };
        c.addEventListener('pointerdown', down, { passive: false });
        c.addEventListener('pointermove', move, { passive: false });
        c.addEventListener('pointerup', up);
        c.addEventListener('pointercancel', up);
        return () => { ro.disconnect(); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '3/4',
                borderRadius: 20, overflow: 'hidden', cursor: 'col-resize', userSelect: 'none',
                touchAction: 'none', WebkitUserSelect: 'none',
                border: '2px solid rgba(220,38,38,0.3)', boxShadow: '0 0 60px rgba(220,38,38,0.15)',
            }}
        >
            <img src="/hero/mihon_after.webp" alt="After" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
            <div ref={beforeRef} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%', overflow: 'hidden', willChange: 'width', contain: 'layout style paint' }}>
                <img ref={beforeImgRef} src="/hero/mihon_before.webp" alt="Before" loading="eager" decoding="async" style={{ position: 'absolute', top: 0, left: 0, height: '100%', objectFit: 'cover', maxWidth: 'none' }} draggable={false} />
            </div>
            <div ref={lineRef} style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, background: '#fff', transform: 'translateX(-50%)', zIndex: 2, boxShadow: '0 0 8px rgba(0,0,0,0.5)' }} />
            <div ref={handleRef} style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 3,
                width: 44, height: 44, borderRadius: '50%', background: 'rgba(220,38,38,0.9)', border: '3px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}>
                ⟷
            </div>
            <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', fontSize: 11, color: '#ccc', fontWeight: 600, zIndex: 1 }}>BEFORE</div>
            <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(220,38,38,0.7)', fontSize: 11, color: '#fff', fontWeight: 600, zIndex: 1 }}>AFTER</div>
        </div>
    );
}

export default function AboutPage() {
    const { createChat, setGenerationType, chats } = useAppStore();
    const { t } = useTranslation();
    const [activeFeature, setActiveFeature] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
        const interval = setInterval(() => setActiveFeature(f => (f + 1) % 3), 3000);
        return () => clearInterval(interval);
    }, []);

    const handleToolClick = (type: string) => {
        setGenerationType(type as any);
        if (chats.length === 0) createChat();
    };

    const gradients = [
        'linear-gradient(160deg, #2a1520, #150d12)',
        'linear-gradient(160deg, #151d2a, #0d1115)',
        'linear-gradient(160deg, #1d2a15, #111509)',
        'linear-gradient(160deg, #2a2215, #15120d)',
        'linear-gradient(160deg, #201528, #130d18)',
        'linear-gradient(160deg, #15282a, #0d1515)',
        'linear-gradient(160deg, #281515, #180d0d)',
        'linear-gradient(160deg, #15152a, #0d0d18)',
    ];
    const emojis = ['👩', '⚔️', '🌅', '🌃', '🎨', '📸', '💜', '🧚'];
    const heroImages = ['/hero/card2-after.webp', '/hero/card3-after.webp', '/hero/card4-after.webp', '/hero/card5-after.webp'];

    return (
        <div className="hp-root">
            <section className="hp-hero" style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'none' : 'translateY(20px)' }}>
                <div className="hp-glow" style={{ top: -200, right: -100, background: 'radial-gradient(circle, #dc2626, transparent)' }} />
                <div className="hp-glow" style={{ top: 200, left: -200, background: 'radial-gradient(circle, #7c1d1d, transparent)', opacity: 0.08 }} />
                <div className="hp-hero-inner">
                    <div>
                        <div className="hp-label"><span className="hp-pulse">●</span> AI-Powered Generation</div>
                        <h1 className="hp-title">AI Undress Tool.<br /><span className="hp-accent-text">Upload a photo. Remove clothing.</span><br />Done in 8 seconds.</h1>
                        <p className="hp-subtitle">Upload any photo and our AI removes clothing instantly. Photorealistic results. No experience needed. Free to start.</p>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
                            <Link href="/editor" className="hp-btn-primary">Try It Free <span style={{ fontSize: 18 }}>→</span></Link>
                            <a href="#hp-gallery" className="hp-btn-ghost">View Gallery</a>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['Undress AI', 'Face Swap', 'Nude Mode', 'Inpaint', 'Free Trial'].map(tag => (
                                <span key={tag} className="hp-tag">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <BeforeAfterSlider />
                    </div>
                </div>
            </section>

            <TryItNowSection />

            <section className="hp-stats-bar">
                <div className="hp-stats-inner">
                    {STATS.map((s, i) => (
                        <div key={i} className="hp-stat">
                            <div className="hp-stat-value">{s.value}</div>
                            <div className="hp-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="hp-section hp-section-pad">
                <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
                    <div className="hp-label">Simple Process</div>
                    <h2 className="hp-heading" style={{ marginBottom: 60 }}>Three Steps. <span className="hp-accent-text">That's It.</span></h2>
                    <div className="hp-steps-grid">
                        {[
                            { num: '01', title: 'Describe', desc: 'Type what you want to create, or select from style presets and tags.' },
                            null,
                            { num: '02', title: 'Generate', desc: 'AI creates your image in under 10 seconds. Adjust and regenerate freely.' },
                            null,
                            { num: '03', title: 'Download', desc: 'Save in high resolution. Your images, your privacy, always.' },
                        ].map((step, i) => step === null ? (
                            <div key={i} className="hp-step-connector" />
                        ) : (
                            <div key={i} style={{ padding: '0 20px' }}>
                                <div className="hp-step-num">{step.num}</div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="hp-gallery" className="hp-section hp-section-pad">
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }} className="hp-gallery-wrap">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 40 }}>
                        <div>
                            <div className="hp-label">Showcase</div>
                            <h2 className="hp-heading">See What's <span className="hp-accent-text">Possible</span></h2>
                        </div>
                    </div>
                    <div className="hp-gallery-grid">
                        {SAMPLE_IMAGES.map((img, i) => (
                            <div key={i} className="hp-gallery-card">
                                <img src={heroImages[i % heroImages.length]} alt={img.style} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
                                <div className="hp-card-overlay">
                                    <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginBottom: 2 }}>{img.style}</div>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>"{img.prompt}"</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 48 }}>
                        <Link href="/editor" className="hp-btn-primary" style={{ fontSize: 16, padding: '18px 48px' }} onClick={() => handleToolClick('txt2img')}>
                            Start Creating — It's Free <span style={{ fontSize: 20 }}>→</span>
                        </Link>
                        <p style={{ fontSize: 13, color: '#555', marginTop: 12 }}>No credit card required. Free credits on sign up.</p>
                    </div>
                </div>
            </section>

            <section className="hp-section hp-section-pad">
                <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                    <div className="hp-label">Powerful Tools</div>
                    <h2 className="hp-heading" style={{ marginBottom: 12 }}>Everything You <span className="hp-accent-text">Need</span></h2>
                    <p className="hp-subtext" style={{ marginBottom: 48 }}>From text prompts to video generation — all in one platform.</p>
                    <div className="hp-features-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className={`hp-feature-card ${activeFeature === i ? 'active' : ''}`} onClick={() => setActiveFeature(i)}>
                                <div style={{ fontSize: 32, marginBottom: 16, color: '#f87171' }}>{f.icon}</div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
                        {['Inpainting', 'Style Presets', '4K Upscale', 'Pose Control', 'NSFW Mode', 'Batch Generation'].map(tag => (
                            <span key={tag} className="hp-tag">{tag}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="hp-section hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <div className="hp-label">Testimonials</div>
                        <h2 className="hp-heading">Loved by <span className="hp-accent-text">Creators</span></h2>
                    </div>
                    <div className="hp-reviews-grid">
                        {REVIEWS.map((r, i) => (
                            <div key={i} className="hp-review-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${r.color}, ${r.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>{r.avatar}</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                                        <StarRating count={r.rating} />
                                    </div>
                                </div>
                                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, fontStyle: 'italic' }}>"{r.text}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="hp-section hp-section-pad-lg" style={{ textAlign: 'center' }}>
                <div className="hp-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, #dc2626, transparent)', opacity: 0.08, width: 800, height: 400 }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="hp-cta-heading">
                        Ready to Create<br /><span className="hp-accent-text">Something Amazing</span>?
                    </h2>
                    <p className="hp-subtext" style={{ maxWidth: 400, margin: '0 auto 40px' }}>Join thousands of creators. Start generating for free. No credit card needed.</p>
                    <Link href="/register" className="hp-btn-primary" style={{ fontSize: 18, padding: '20px 56px' }}>
                        Get Started — Free <span style={{ fontSize: 22 }}>→</span>
                    </Link>
                </div>
            </section>

            <footer className="hp-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="hp-footer-logo">N</div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#555' }}>ImageNude</span>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[{ label: 'AI Undress', href: '/undress-ai' }, { label: 'Face Swap', href: '/face-swap' }, { label: 'Blog', href: '/blog' }, { label: 'NSFW AI Guide', href: '/blog/how-to-generate-nsfw-ai-images' }, { label: 'Best Undress Tools', href: '/blog/best-ai-undress-tools' }, { label: 'Face Swap Guide', href: '/blog/ai-face-swap-adults' }, { label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }, { label: 'Content Policy', href: '/content-policy' }, { label: 'DMCA', href: '/dmca' }, { label: '2257', href: '/2257' }].map(l => (
                        <Link key={l.label} href={l.href} style={{ color: '#444', textDecoration: 'none', fontSize: 13 }}>{l.label}</Link>
                    ))}
                </div>
                <div style={{ fontSize: 12, color: '#333' }}>© 2026 All rights reserved</div>
            </footer>
        </div>
    );
}
