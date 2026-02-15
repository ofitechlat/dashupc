import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) return NextResponse.json({ error: 'Email required' });

    // List users to find the specific one (admin.getUserByEmail is not always available in all client versions, listUsers is safer)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        return NextResponse.json({ error: error.message });
    }

    const user = data.users.find(u => u.email === email);

    if (!user) {
        return NextResponse.json({ exists: false, message: 'User not found in Auth' });
    }

    // Check student link
    const { data: student } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return NextResponse.json({
        exists: true,
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        confirmed: !!user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        role: user.role,
        student_link: student ? 'Linked' : 'Not Linked',
        student_data: student
    });
}
