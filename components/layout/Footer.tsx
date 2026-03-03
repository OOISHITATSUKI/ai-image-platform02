'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{
            background: 'var(--bg-sidebar)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '60px 20px',
            marginTop: 'auto',
            width: '100%'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '40px'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '40px'
                }}>
                    {/* Brand Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/logo-dark.png" alt="Image Nude AI" className="logo-dark" style={{ maxHeight: '36px' }} />
                            <img src="/logo-light.png" alt="Image Nude AI" className="logo-light" style={{ maxHeight: '36px' }} />
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            Premium AI-powered image generation and enhancement platform. Experience the next generation of creative tools.
                        </p>
                    </div>

                    {/* Legal Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>Legal</h4>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link href="/terms" style={linkStyle}>Terms of Service</Link>
                            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
                            <Link href="/content-policy" style={linkStyle}>Content Policy</Link>
                            <Link href="/dmca" style={linkStyle}>DMCA Policy</Link>
                            <Link href="/2257" style={linkStyle}>2257 Statement</Link>
                        </nav>
                    </div>

                    {/* Support Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>Support</h4>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link href="/help" style={linkStyle}>Help Center</Link>
                            <a href="mailto:support@imagenude.com" style={linkStyle}>support@imagenude.com</a>
                        </nav>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        Copyright © 2026 Image Nude AI. All rights reserved.
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
                        18 U.S.C. § 2257 Record-Keeping Requirements Compliance Statement: All models appearing on this site were 18 years of age or older at the time of depiction or are AI-generated imagery.
                    </p>
                </div>
            </div>
        </footer>
    );
}

const linkStyle = {
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.2s',
    cursor: 'pointer'
};
