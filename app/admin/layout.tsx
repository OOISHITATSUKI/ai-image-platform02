import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Server component to protect all /admin routes
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        redirect('/login');
    }

    // Call the /api/auth/me endpoint locally to verify the user
    // In next.js app router server components, we fetch with full URL
    // But since this is a server component, we should ideally verify the token directly.
    // For simplicity, we'll verify it and check if user is admin.

    // Import the auth helpers directly to prevent an extra HTTP call
    const { verifyToken, findUserById } = await import('@/lib/auth');

    const decoded = verifyToken(token);
    if (!decoded) {
        redirect('/login');
    }

    const user = findUserById(decoded.userId);
    if (!user) {
        redirect('/login');
    }

    // Check if user email is in ADMIN_EMAILS
    const adminEmailsConfig = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsConfig.split(',').map(e => e.trim().toLowerCase());

    if (!adminEmails.includes(user.email.toLowerCase())) {
        // If not an admin, deny access completely (pretend it doesn't exist)
        // You could also render a custom 404 here, but redirecting to home is common.
        redirect('/');
    }

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
            overflow: 'hidden'
        }}>
            <AdminSidebar />
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px 48px',
                backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
                {children}
            </div>
        </div>
    );
}
