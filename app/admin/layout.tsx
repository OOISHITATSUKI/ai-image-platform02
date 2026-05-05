import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import './admin.css';

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

    const { verifyToken, findUserById } = await import('@/lib/auth');

    const decoded = verifyToken(token);
    if (!decoded) {
        redirect('/login');
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
        redirect('/login');
    }

    const adminEmailsConfig = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsConfig.split(',').map(e => e.trim().toLowerCase());

    if (!adminEmails.includes(user.email.toLowerCase())) {
        redirect('/');
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />
            <div className="admin-content">
                {children}
            </div>
        </div>
    );
}
