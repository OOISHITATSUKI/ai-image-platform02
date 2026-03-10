'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    const [demoState, setDemoState] = useState<'idle' | 'processing' | 'result' | 'error' | 'limit'>('idle');
    const [ethnicity, setEthnicity] = useState('japanese');
    const [bustSize, setBustSize] = useState('medium');
    const [prompt, setPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const getFingerprint = useCallback(() => {
        if (typeof window === 'undefined') return 'ssr';
        const nav = window.navigator;
        const raw = [nav.userAgent, nav.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset()].join('|');
        let hash = 0;
        for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
        return hash.toString(36);
    }, []);

    const handleGenerate = async () => {
        setDemoState('processing'); setProgress(0);
        progressRef.current = setInterval(() => {
            setProgress(p => p >= 90 ? 90 : p + Math.random() * 6 + 2);
        }, 600);
        try {
            const res = await fetch('/api/demo-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ethnicity, bustSize, prompt, fingerprintHash: getFingerprint() }),
            });
            if (progressRef.current) clearInterval(progressRef.current);
            if (res.status === 429) { setDemoState('limit'); return; }
            const data = await res.json();
            if (!res.ok || !data.success) { setErrorMsg(data.error || 'Generation failed.'); setDemoState('error'); return; }
            setProgress(100); setResultImage(data.image);
            setTimeout(() => setDemoState('result'), 400);
        } catch {
            if (progressRef.current) clearInterval(progressRef.current);
            setErrorMsg('Network error. Please try again.'); setDemoState('error');
        }
    };

    const handleReset = () => { setDemoState('idle'); setResultImage(null); setProgress(0); setErrorMsg(''); };

    const ethnicityOptions = [
        { value: 'asian', label: '🌏 Asian' },
        { value: 'european', label: '🌍 European' },
        { value: 'latina', label: '💃 Latina' },
        { value: 'black', label: '✨ Black' },
        { value: 'middleeastern', label: '🌙 Middle Eastern' },
    ];
    const bustOptions = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'huge', label: 'Huge' },
    ];
    const bustIndex = bustOptions.findIndex(o => o.value === bustSize);

    return (
        <section className="hp-section hp-section-pad">
            <div className="hp-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 500, background: 'radial-gradient(circle, rgba(220,38,38,0.06), transparent 70%)' }} />
            <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div className="hp-label"><span className="hp-pulse">●</span> Live Demo — No Sign Up Required</div>
                    <h2 className="hp-heading">See the Magic <span className="hp-accent-text">Yourself</span></h2>
                    <p className="hp-subtext" style={{ maxWidth: 500, margin: '0 auto' }}>Choose your preferences and generate instantly. No account needed.</p>
                </div>
                <div className="hp-demo-card">
                    {demoState === 'idle' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <div className="hp-demo-label">Ethnicity</div>
                                <div className="hp-demo-options">
                                    {ethnicityOptions.map(o => (
                                        <button key={o.value} className={`hp-demo-opt ${ethnicity === o.value ? 'active' : ''}`} onClick={() => setEthnicity(o.value)}>{o.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="hp-demo-label">Bust Size — <span style={{ color: '#f87171' }}>{bustOptions[bustIndex]?.label}</span></div>
                                <div className="hp-bust-slider-wrap">
                                    <input type="range" min={0} max={3} step={1} value={bustIndex}
                                        onChange={e => setBustSize(bustOptions[Number(e.target.value)].value)}
                                        className="hp-bust-slider" />
                                    <div className="hp-bust-labels">
                                        {bustOptions.map(o => <span key={o.value}>{o.label}</span>)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="hp-demo-label">Describe the scene <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></div>
                                <textarea
                                    className="hp-demo-textarea"
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder="e.g. on the beach, sunset lighting, looking at camera, outdoor..."
                                    maxLength={200}
                                    rows={3}
                                />
                            </div>
                            <button className="hp-btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '18px' }} onClick={handleGenerate}>
                                ✨ Generate — Free
                            </button>
                            <div className="hp-trust-row" style={{ justifyContent: 'center', fontSize: 12, color: '#444' }}>
                                <span>🚫 No sign up needed</span>
                                <span>⚡ ~10 seconds</span>
                                <span>🔒 Private</span>
                            </div>
                        </div>
                    )}
                    {demoState === 'processing' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 16, animation: 'hpPulse 1s ease infinite' }}>⚡</div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>AI is generating your image...</h3>
                            <div className="hp-progress-track"><div className="hp-progress-bar" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
                            <p style={{ fontSize: 13, color: '#555', marginTop: 12 }}>{Math.round(Math.min(progress, 100))}%</p>
                        </div>
                    )}
                    {demoState === 'result' && resultImage && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(220,38,38,0.2)', boxShadow: '0 0 40px rgba(220,38,38,0.1)', maxWidth: 360, margin: '0 auto 24px', position: 'relative' }}>
                                <img src={resultImage} alt="Generated" style={{ width: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }} draggable={false} onContextMenu={e => e.preventDefault()} />
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent' }} onContextMenu={e => e.preventDefault()} />
                                <div style={{ position: 'absolute', bottom: 12, right: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.5px' }}>PREVIEW · 512px</div>
                            </div>
                            <div className="hp-signup-banner">
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔥 Like what you see? Get HD quality!</div>
                                    <div style={{ fontSize: 13, color: '#888' }}>Sign up free → 20 credits · HD 1024px · Download · Unlimited styles</div>
                                </div>
                                <Link href="/register" className="hp-btn-primary" style={{ whiteSpace: 'nowrap' }}>Sign Up Free →</Link>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                                <Link href="/register" style={{ fontSize: 14, color: '#e5342a', fontWeight: 600, textDecoration: 'none' }}>Create Account for HD Download →</Link>
                            </div>
                            <button onClick={handleReset} className="hp-btn-text">↺ Generate another</button>
                        </div>
                    )}
                    {demoState === 'error' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h3>
                            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>{errorMsg}</p>
                            <button className="hp-btn-primary" onClick={handleReset}>Try Again</button>
                        </div>
                    )}
                    {demoState === 'limit' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>You liked it!</h3>
                            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Free demo limit reached. Sign up to unlock unlimited generations + HD quality.</p>
                            <Link href="/register" className="hp-btn-primary">Sign Up Free — Get 20 Credits</Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function HomePage() {
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
                        <div className="hp-mobile-preview">
                            {[0, 1].map(i => (
                                <div key={i} className="hp-mobile-preview-card">
                                    <img src={heroImages[i]} alt="AI Generated" />
                                    <div className="hp-mobile-preview-badge">AI Generated</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
                            <Link href="/register" className="hp-btn-primary">Try Undress AI — Free <span style={{ fontSize: 18 }}>→</span></Link>
                            <a href="#hp-gallery" className="hp-btn-ghost">View Gallery</a>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['Undress AI', 'Face Swap', 'Nude Mode', 'Inpaint', 'Free Trial'].map(tag => (
                                <span key={tag} className="hp-tag">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="hp-hero-grid">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="hp-gallery-card" style={{ marginTop: i % 2 === 1 ? 32 : 0 }}>
                                <img src={heroImages[i]} alt="AI Generated" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
                                <div className="hp-card-overlay">
                                    <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginBottom: 2 }}>AI Generated</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

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

            <TryItNowSection />

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
