export const metadata = {
    title: 'Content Policy - VideoGen',
};

export default function ContentPolicyPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
            <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Content Policy</h1>
            <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>1. Purpose</h2>
                <p>This Content Policy outlines the types of content that are permitted and prohibited on the VideoGen platform. All users must comply with this policy at all times.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>2. Strictly Prohibited Content</h2>
                <p>The following types of content are <strong>strictly prohibited</strong> and will result in immediate account termination:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Minor-related content:</strong> Any content depicting, suggesting, or resembling minors (persons under 18) in any sexual, suggestive, or inappropriate context. This includes age-play, school uniforms in sexual contexts, or any content that could be interpreted as involving minors.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Non-consensual imagery:</strong> Deepfakes or realistic imagery resembling real, identifiable individuals without their explicit written consent.</li>
                    <li style={{ marginBottom: '8px' }}><strong>CSAM:</strong> Child Sexual Abuse Material of any kind.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Violence and gore:</strong> Extreme violence, torture, or graphic gore.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Illegal activities:</strong> Content that promotes, glorifies, or instructs on illegal activities.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>3. Content Usage Restrictions</h2>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li style={{ marginBottom: '8px' }}>Generated content is for <strong>personal use only</strong>.</li>
                    <li style={{ marginBottom: '8px' }}>Commercial use, sales, or distribution of generated content is strictly prohibited.</li>
                    <li style={{ marginBottom: '8px' }}>Sharing generated content on platforms that do not allow adult content is prohibited.</li>
                    <li style={{ marginBottom: '8px' }}>Users must not claim AI-generated content as real photography or mislead others about its nature.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>4. Monitoring and Enforcement</h2>
                <p>We actively monitor prompts and generated content using automated systems and manual review. Violations may result in:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>First warning:</strong> Content removal and account warning (for minor policy violations).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Temporary suspension:</strong> 24-hour to 30-day account suspension.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Permanent ban:</strong> Permanent account termination and IP ban (for serious violations including any minor-related content).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Legal action:</strong> Reporting to law enforcement when required by law.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>5. Reporting</h2>
                <p>If you encounter content that you believe violates this policy, please report it immediately through our DMCA/report page. All reports are reviewed within 24 hours.</p>
            </section>
        </div>
    );
}
