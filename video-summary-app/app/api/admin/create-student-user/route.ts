import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { studentId, email, password, name } = body;

        if (!studentId || !email || !password) {
            return NextResponse.json({ error: 'Faltan datos requeridos (studentId, email, password)' }, { status: 400 });
        }

        console.log(`[API] Creando usuario para estudiante ${name} (${email})...`);

        // 1. Crear usuario en Supabase Auth
        // Usamos createUser para auto-confirmar el email
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { name: name }
        });

        if (authError) {
            console.error('[API] Error creando usuario auth:', authError);
            return NextResponse.json({ error: 'Error creando usuario: ' + authError.message }, { status: 400 });
        }

        const userId = authData.user.id;
        console.log(`[API] Usuario creado con ID: ${userId}`);

        // 2. Vincular usuario con la tabla students
        const { error: dbError } = await supabaseAdmin
            .from('students')
            .update({
                user_id: userId,
                must_change_password: true
            })
            .eq('id', studentId);

        if (dbError) {
            console.error('[API] Error actualizando tabla students:', dbError);
            // Intentar rollback (borrar usuario) si falla la DB?
            // Por ahora solo retornamos error, el usuario quedó creado pero "huerfano" de link.
            return NextResponse.json({ error: 'Usuario creado pero falló el vínculo: ' + dbError.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario creado y vinculado correctamente',
            userId: userId
        });

    } catch (e: any) {
        console.error('[API] Excepción:', e);
        return NextResponse.json({ error: 'Error interno: ' + e.message }, { status: 500 });
    }
}
