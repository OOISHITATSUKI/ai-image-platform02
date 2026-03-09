import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e8f0',
      fontFamily: 'sans-serif',
      padding: 20,
    }}>
      <div style={{
        fontSize: '120px',
        fontWeight: 800,
        background: 'linear-gradient(135deg, #7c5cfc 0%, #a78bfa 50%, #7c5cfc 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1,
        marginBottom: 8,
      }}>404</div>
      <p style={{ fontSize: '1.1rem', color: '#8888a0', marginTop: 12, marginBottom: 32, textAlign: 'center' }}>
        This page does not exist.
      </p>
      <Link href="/" style={{
        padding: '14px 32px',
        background: 'linear-gradient(135deg, #7c5cfc, #6a4ff0)',
        color: '#fff',
        borderRadius: 12,
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '1rem',
        boxShadow: '0 4px 20px rgba(124,92,252,0.35)',
        transition: 'transform 0.2s',
      }}>
        Go to Home
      </Link>
    </div>
  );
}
