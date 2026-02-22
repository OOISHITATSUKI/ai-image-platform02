import { NextRequest, NextResponse } from 'next/server';
import {
    findUserByEmail,
    findUserByUsername,
    saveUser,
    signToken,
} from '@/lib/auth';

// POST: STEP 6 — Profile setup (username, date of birth, country)
export async function POST(req: NextRequest) {
    try {
        const { email, username, dateOfBirth, country } = await req.json();

        if (!email || !username || !dateOfBirth || !country) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const user = findUserByEmail(email.toLowerCase().trim());
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.status !== 'pending_profile') {
            return NextResponse.json({ error: 'Invalid registration step' }, { status: 400 });
        }

        // Validate username (3-20 chars, alphanumeric + underscore)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json({
                error: 'Username must be 3-20 characters, alphanumeric and underscores only',
            }, { status: 400 });
        }

        // Check username uniqueness
        const existingUsername = findUserByUsername(username);
        if (existingUsername && existingUsername.id !== user.id) {
            return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
        }

        // Calculate age from date of birth
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (age < 18) {
            // Under 18 — restrict account
            user.status = 'age_restricted';
            user.username = username;
            user.dateOfBirth = dateOfBirth;
            user.country = country;
            saveUser(user);

            return NextResponse.json({
                error: 'You must be 18 or older to use this service',
                ageRestricted: true,
            }, { status: 403 });
        }

        // Validate country (ISO 3166-1 alpha-2)
        if (!/^[A-Z]{2}$/.test(country)) {
            return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
        }

        // Update profile and activate
        user.username = username;
        user.dateOfBirth = dateOfBirth;
        user.country = country;
        user.status = 'active';
        saveUser(user);

        // Generate JWT token
        const token = signToken(user.id, user.email);

        return NextResponse.json({
            success: true,
            message: 'Profile saved. Welcome!',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                plan: user.plan,
                credits: user.credits,
                locale: user.locale,
                theme: user.theme,
                status: user.status,
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                firstGenerationConfirmed: user.firstGenerationConfirmed,
            },
        });
    } catch (error) {
        console.error('Profile setup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
