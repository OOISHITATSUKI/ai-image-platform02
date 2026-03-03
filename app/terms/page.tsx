'use client';

import Link from 'next/link';
export default function TermsPage() {
    const sections = [
        "ACCEPTANCE OF TERMS", "AGE RESTRICTION", "ACCOUNT REGISTRATION", "SERVICE DESCRIPTION",
        "PROHIBITED ACTIVITIES", "CONTENT FILTERING AND AUTOMATED RESTRICTIONS", "AI-GENERATED CONTENT DISCLAIMER",
        "AI TRAINING AND DATA HANDLING", "IMAGE USE RESTRICTIONS", "PREPAID CREDITS AND REFUND POLICY",
        "SERVICE INTERRUPTION AND TERMINATION", "LIMITATION OF LIABILITY", "CHANGES TO TERMS",
        "GOVERNING LAW, JURISDICTION, AND REGIONAL RESTRICTIONS", "CONTACT", "ACCOUNT DELETION"
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px', display: 'flex', gap: '40px', position: 'relative' }}>
            {/* Sticky Sidebar TOC */}
            <aside style={{ width: '250px', position: 'sticky', top: '60px', height: 'fit-content', display: 'none', flexDirection: 'column', gap: '10px' }} className="toc-sidebar">
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contents</h4>
                {sections.map((section, idx) => (
                    <a key={idx} href={`#section-${idx + 1}`} style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                        {idx + 1}. {section}
                    </a>
                ))}
            </aside>

            <div style={{ flex: 1, maxWidth: '800px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        marginBottom: '32px'
                    }}
                >
                    ← Back
                </Link>

                <h1 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Terms of Service</h1>
                <p style={{ marginBottom: '32px', fontSize: '0.9rem', opacity: 0.8 }}>Last Updated: March 2, 2026</p>

                <section id="section-1" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>1. ACCEPTANCE OF TERMS</h2>
                    <p>These Terms of Service ("Terms") govern the use of the AI image generation service "[Service Name]" ("Service") operated by [Company Name] ("Company," "we," "us," or "our").</p>
                    <p>By creating an account or using the Service, you agree to be bound by these Terms in their entirety. If you do not agree to these Terms, you may not use the Service.</p>
                </section>

                <section id="section-2" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>2. AGE RESTRICTION</h2>
                    <p>2.1. This Service contains adult content. You must be at least 18 years of age to use this Service.</p>
                    <p>2.2. You confirm that you are 18 years of age or older at the time of account registration.</p>
                    <p>2.3. If you provide false age information to access this Service, you bear all legal responsibility arising from such misrepresentation.</p>
                    <p>2.4. If we determine that a user is under 18 years of age, we will delete the account without prior notice. No refund of credit balance will be issued.</p>
                    <p>2.5. We employ a self-declaration method for age verification (date of birth entry and age confirmation checkbox). We are not obligated to verify the accuracy of such declarations. All legal liability arising from false declarations rests solely with the user. We may implement stricter age verification methods in the future.</p>
                </section>

                <section id="section-3" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>3. ACCOUNT REGISTRATION</h2>
                    <p>3.1. You must provide accurate information when registering an account.</p>
                    <p>3.2. Creating multiple accounts per person is prohibited.</p>
                    <p>3.3. Transferring, selling, or sharing accounts is prohibited.</p>
                    <p>3.4. You are responsible for maintaining the security of your account. We are not liable for unauthorized use by third parties.</p>
                    <p>3.5. We may require additional identity verification (such as email verification) during login for security and fraud prevention purposes. You agree to cooperate with such measures.</p>
                </section>

                <section id="section-4" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>4. SERVICE DESCRIPTION</h2>
                    <p>4.1. The Service generates images using artificial intelligence based on text prompts entered by users.</p>
                    <p>4.2. All generated images are created by AI and are not related to any real persons, places, or events.</p>
                    <p>4.3. We may modify, add to, or discontinue the Service at any time without prior notice.</p>
                </section>

                <section id="section-5" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>5. PROHIBITED ACTIVITIES</h2>
                    <p>You must not engage in the following activities when using the Service.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>5.1. Absolute Prohibitions (Immediate Permanent Suspension)</h3>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>(a) Attempting to generate images that depict or appear to depict minors. Even AI-generated sexual images of minors are illegal in many jurisdictions.</li>
                        <li>(b) Entering prompts that suggest or reference minors. This includes but is not limited to:
                            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                <li>Words directly indicating minors (child, teen, girl, underage, etc.)</li>
                                <li>School-related terms (school, uniform, schoolgirl, etc.)</li>
                                <li>Age expressions indicating anyone under 18</li>
                                <li>Subcultural terms associated with minors (loli, shota, etc.)</li>
                            </ul>
                        </li>
                        <li>(c) Attempting to generate images resembling real persons. This includes celebrities, public figures, and private individuals.</li>
                        <li>(d) Distributing generated images while falsely claiming they depict real persons.</li>
                    </ul>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>5.2. General Prohibitions</h3>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>(e) Attempting to circumvent the content filtering system (including character substitution, space insertion, etc.)</li>
                        <li>(f) Using the Service to infringe upon the rights of third parties (copyright, likeness rights, privacy rights, etc.)</li>
                        <li>(g) Unauthorized access to, modification of, or interference with the Service's systems</li>
                        <li>(h) Using the Service for illegal activities or to facilitate illegal activities</li>
                        <li>(i) Interfering with the operation of the Service</li>
                        <li>(j) Any other activity we deem inappropriate</li>
                    </ul>
                </section>

                <section id="section-6" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>6. CONTENT FILTERING AND AUTOMATED RESTRICTIONS</h2>
                    <p>6.1. We employ a prompt filtering system to prevent the generation of prohibited content.</p>
                    <p>6.2. Prompts flagged by the filtering system will not be executed, and a record of the attempt will be saved.</p>
                    <p>6.3. Repeated filtering violations will result in the following automated measures:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Display of a warning</li>
                            <li>Temporary account suspension (24 hours)</li>
                            <li>Permanent account suspension</li>
                        </ul>
                    </p>
                    <p>6.4. We reserve the right to suspend or delete accounts without prior notice.</p>
                    <p>6.5. No refund of credit balance will be issued for suspended or deleted accounts.</p>
                </section>

                <section id="section-7" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>7. AI-GENERATED CONTENT DISCLAIMER</h2>
                    <p>7.1. All images generated by the Service are automatically produced by artificial intelligence.</p>
                    <p>7.2. If a generated image unintentionally resembles a real person, this is purely coincidental. We assume no responsibility for such resemblances.</p>
                    <p>7.3. We do not guarantee the quality, accuracy, or legality of generated images.</p>
                    <p>7.4. You assume all responsibility for your use of generated images.</p>
                </section>

                <section id="section-8" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>8. AI TRAINING AND DATA HANDLING</h2>
                    <p>8.1. Your prompts are NOT used for AI model training or improvement.</p>
                    <p>8.2. However, prompts and related data may be stored and used for the following purposes:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Improving content filtering accuracy</li>
                            <li>Detecting and preventing misuse</li>
                            <li>Maintaining service stability and quality</li>
                            <li>Responding to legal obligations (e.g., law enforcement requests)</li>
                        </ul>
                    </p>
                    <p>8.3. Generated images are not permanently stored on our servers. They are cached for a maximum of 72 hours and then automatically deleted.</p>
                    <p>8.4. Images downloaded by users are managed under the user's own responsibility.</p>
                </section>

                <section id="section-9" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>9. IMAGE USE RESTRICTIONS</h2>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>9.1. Personal Use Only</h3>
                    <p>(a) Images generated by the Service may only be used for personal, non-commercial purposes.</p>
                    <p>(b) "Personal use" means:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Personal viewing and enjoyment</li>
                            <li>Saving to personal devices</li>
                            <li>Storage as a private personal collection</li>
                        </ul>
                    </p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>9.2. Prohibited Uses (Commercial Use and Sales Prohibited)</h3>
                    <p>The following activities are strictly prohibited. Violations will result in immediate permanent account suspension (BAN) with no refund of credit balance.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>(a) Selling generated images. This includes but is not limited to:
                            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                <li>Direct sale of images</li>
                                <li>Sale of image packs or collections</li>
                                <li>Listing or selling as NFTs</li>
                                <li>Registration on stock photo websites</li>
                                <li>Distribution as commercial publications</li>
                                <li>Distribution via subscription services</li>
                            </ul>
                        </li>
                        <li>(b) Commercial use. This includes but is not limited to:
                            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                <li>Use in advertising, marketing, or promotions</li>
                                <li>Use as content for websites, apps, or services</li>
                                <li>Publication in magazines, books, or other media</li>
                                <li>Use in product design</li>
                                <li>Posting on social media accounts for revenue purposes</li>
                            </ul>
                        </li>
                        <li>(c) Redistribution. Mass public distribution of generated images, even if free of charge, is prohibited.</li>
                    </ul>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>9.3. Detection and Enforcement</h3>
                    <p>(a) We may embed invisible digital watermarks in generated images to detect unauthorized use.</p>
                    <p>(b) If unauthorized use is discovered, we will immediately and permanently suspend the account, forfeit all credit balance, and take legal action as necessary.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>9.4. Intellectual Property</h3>
                    <p>(a) All intellectual property rights related to the Service's systems, design, logos, and source code belong to the Company.</p>
                    <p>(b) The copyright status of AI-generated images has not been definitively established in many jurisdictions. Users assume all legal risks related to generated images.</p>
                </section>

                <section id="section-10" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>10. PREPAID CREDITS AND REFUND POLICY</h2>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>10.1. Prepaid Credits</h3>
                    <p>(a) The Service uses a prepaid credit system with cryptocurrency payments. You must purchase credits by sending the specified cryptocurrency before using the image generation features.</p>
                    <p>(b) Credits may only be used for image generation within the Service.</p>
                    <p>(c) Credits cannot be converted to fiat currency, reconverted to cryptocurrency, or transferred to other services or accounts.</p>
                    <p>(d) Credits do not expire, but the refund policy below applies upon account deletion or suspension.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>10.2. Refund Policy (Important)</h3>
                    <p>You acknowledge and agree to the following before purchasing credits:</p>
                    <p>(a) Credit balance refunds will not be issued under any circumstances. This includes all of the following cases:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Voluntary account cancellation by the user</li>
                            <li>Account suspension due to Terms of Service violations</li>
                            <li>Permanent account ban (BAN) due to Terms of Service violations</li>
                            <li>Service modifications or termination</li>
                            <li>Any other reason whatsoever</li>
                        </ul>
                    </p>
                    <p>(b) If your account is suspended or permanently banned, your credit balance will be forfeited. No refunds will be issued in cryptocurrency, fiat currency (cash), or any other form.</p>
                    <p>(c) If your account is suspended due to violations of Section 5 (Prohibited Activities), you are deemed to have waived any right to claim a refund.</p>
                    <p>(d) Please carefully review this section and understand that all charges are non-refundable before purchasing credits.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>10.3. Payment Processing</h3>
                    <p>(a) Payment processing is handled through a third-party payment service (NowPayments).</p>
                    <p>(b) Cryptocurrency transaction fees (gas fees, network fees, etc.) are the user's responsibility.</p>
                    <p>(c) We are not liable for losses arising from cryptocurrency price fluctuations.</p>
                    <p>(d) We are not responsible for transmission errors or incorrect transfers. Users are responsible for sending the correct currency to the correct address.</p>
                    <p>(e) Credit activation may be delayed depending on blockchain confirmation status.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>10.4. System Failure Compensation</h3>
                    <p>(a) If image generation fails due to a system error, consumed credits will be compensated as in-service credits.</p>
                    <p>(b) This compensation is provided as an addition to your in-service credit balance, not as a cryptocurrency or fiat currency refund.</p>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '16px' }}>10.5. Service Termination</h3>
                    <p>(a) If we terminate the Service, we will provide 30 days' prior notice.</p>
                    <p>(b) After receiving termination notice, users should endeavor to use their remaining credit balance during the notice period.</p>
                    <p>(c) No refund will be issued for credit balances remaining after service termination.</p>
                </section>

                <section id="section-11" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>11. SERVICE INTERRUPTION AND TERMINATION</h2>
                    <p>11.1. We may temporarily interrupt the Service in the following cases:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>System maintenance and updates</li>
                            <li>Force majeure events such as natural disasters or power outages</li>
                            <li>Other cases we deem necessary</li>
                        </ul>
                    </p>
                    <p>11.2. We will endeavor to provide advance notice of service interruptions, but this may not be possible in emergencies.</p>
                    <p>11.3. We are not liable for any damages arising from service interruptions.</p>
                </section>

                <section id="section-12" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>12. LIMITATION OF LIABILITY</h2>
                    <p>12.1. We do not guarantee the completeness, accuracy, usefulness, or safety of the Service.</p>
                    <p>12.2. We are not liable for any damages arising from your use of the Service, except in cases of our willful misconduct or gross negligence.</p>
                    <p>12.3. We are not liable for disputes between users or between users and third parties.</p>
                </section>

                <section id="section-13" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>13. CHANGES TO TERMS</h2>
                    <p>13.1. We may modify these Terms at any time.</p>
                    <p>13.2. For significant changes, we will notify users through in-service notifications or email.</p>
                    <p>13.3. Your continued use of the Service after changes constitutes acceptance of the modified Terms.</p>
                    <p>13.4. If the Terms version is updated, you may be required to agree to the updated Terms upon your next login.</p>
                </section>

                <section id="section-14" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>14. GOVERNING LAW, JURISDICTION, AND REGIONAL RESTRICTIONS</h2>
                    <p>14.1. These Terms shall be governed by and construed in accordance with the laws of the Republic of Estonia.</p>
                    <p>14.2. Any disputes arising from the Service shall be subject to the exclusive jurisdiction of the courts of the Republic of Estonia as the court of first instance.</p>
                    <p>14.3. The Service is not intended to be provided to residents of countries or regions where the viewing or distribution of adult content is prohibited by law.</p>
                    <p>14.4. You are responsible for confirming that your use of the Service is legal under the laws of your country or region of residence, and for complying with such laws.</p>
                    <p>14.5. If you use the Service in violation of the laws of your country, all legal liability arising therefrom rests solely with you. We assume no liability whatsoever.</p>
                </section>

                <section id="section-15" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>15. CONTACT</h2>
                    <p>For questions regarding these Terms, please contact us at:</p>
                    <p>Email: [Contact Email]</p>
                    <p>Operator: [Company Name]</p>
                </section>

                <section id="section-16" style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>16. ACCOUNT DELETION</h2>
                    <p>16.1. You may delete your account at any time from the account settings page.</p>
                    <p>16.2. Upon account deletion, the following data will be permanently lost and cannot be recovered:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Account information</li>
                            <li>Generation history and all generated image/video data</li>
                            <li>Favorites and collections</li>
                            <li>User settings</li>
                        </ul>
                    </p>
                    <p>16.3. No refund will be issued for any remaining credit balance at the time of account deletion. No refunds will be issued in cryptocurrency, fiat currency, or any other form.</p>
                    <p>16.4. In accordance with legal obligations, the following data may be retained for a specified period after deletion:
                        <ul style={{ paddingLeft: '20px' }}>
                            <li>Payment history (up to 5 years)</li>
                            <li>Security-related logs (up to 1 year)</li>
                        </ul>
                    </p>
                    <p>16.5. We do not support restoration of deleted accounts. To use the Service again, you must create a new account.</p>
                </section>

                <style jsx>{`
                    @media (min-width: 1200px) {
                        .toc-sidebar {
                            display: flex !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
