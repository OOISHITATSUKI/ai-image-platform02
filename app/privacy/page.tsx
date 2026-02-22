export const metadata = {
    title: 'Privacy Policy - VideoGen',
};

export default function PrivacyPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
            <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Privacy Policy</h1>
            <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>1. Information We Collect</h2>
                <p>We collect information necessary to provide and secure our services:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li>Email addresses and wallet addresses for authentication and billing.</li>
                    <li>IP addresses and generation prompts/logs for security, compliance, and abuse prevention.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>2. Use of Information</h2>
                <p>We use this information to operate the service, process transactions, and strictly enforce our Terms of Service (specifically identifying and banning users attempting to violate our minor-protection policies).</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>3. Data Retention and Sharing</h2>
                <p>Generation logs and IP records are kept for a minimum of 90 days for compliance audits. We do not sell your data to third parties. Data may be shared with law enforcement if requested via valid legal process, particularly regarding violations involving minors.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>4. User Rights</h2>
                <p>You may request the deletion of your account and associated personal data by contacting support. Note that some security logs of banned users may be retained indefinitely to prevent platform abuse.</p>
            </section>
        </div>
    );
}
