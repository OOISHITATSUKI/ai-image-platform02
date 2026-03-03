import Link from 'next/link';

export const metadata = {
    title: 'DMCA Policy - [Service Name]',
};

export default function DmcaPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
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

            <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Digital Millennium Copyright Act (DMCA) Policy</h1>
            <p style={{ marginBottom: '16px' }}>Last updated: March 2, 2026</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>1. Notice of Infringement</h2>
                <p>If you believe that any content generated or hosted on our platform infringes upon your copyright, please submit a DMCA takedown notice containing the following:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}>Your physical or electronic signature.</li>
                    <li style={{ marginBottom: '8px' }}>Identification of the copyrighted work claimed to have been infringed.</li>
                    <li style={{ marginBottom: '8px' }}>Identification of the material that is claimed to be infringing, and sufficient information to permit us to locate the material (e.g., specific URLs).</li>
                    <li style={{ marginBottom: '8px' }}>Your contact information (address, telephone number, and email address).</li>
                    <li style={{ marginBottom: '8px' }}>A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner.</li>
                    <li style={{ marginBottom: '8px' }}>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.</li>
                </ul>
                <p>Notices can be sent to our designated Copyright Agent at: <strong>[Contact Email]</strong></p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>2. Counter-Notice</h2>
                <p>If your content was removed due to a DMCA notice and you believe this was an error, you may file a counter-notice containing your contact details, signature, and a statement under penalty of perjury that the content was removed by mistake or misidentification.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '16px' }}>3. Repeat Infringers</h2>
                <p>We maintain a strict policy of terminating the accounts of repeat copyright infringers.</p>
            </section>
        </div>
    );
}
