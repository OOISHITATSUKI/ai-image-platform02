import { NextRequest, NextResponse } from 'next/server';
import {
    findUserByEmail,
    saveUser,
    hashPassword,
    validatePasswordStrength,
} from '@/lib/auth';

// POST: STEP 3 — Password creation
export async function POST(req: NextRequest) {
    try {
        const { email, password, confirmPassword } = await req.json();

        if (!email || !password || !confirmPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
        }

        // Validate password strength
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
            return NextResponse.json({ error: strength.error }, { status: 400 });
        }

        const user = findUserByEmail(email.toLowerCase().trim());
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.status !== 'pending_password') {
            return NextResponse.json({ error: 'Invalid registration step' }, { status: 400 });
        }

        // Hash and save password
        user.passwordHash = await hashPassword(password);
        user.status = 'pending_agreements';
        saveUser(user);

        return NextResponse.json({
            success: true,
            message: 'Password set successfully',
        });
    } catch (error) {
        console.error('Set password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
