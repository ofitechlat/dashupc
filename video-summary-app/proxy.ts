import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const adminRoutes = ['/admin', '/students', '/tutors', '/subjects']
    const isProtected = adminRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    )

    if (isProtected) {
        // ALLOW access to /admin if not logged in so the inline login form can show
        // but protect sub-routes like /admin/videos
        if (!session) {
            const path = request.nextUrl.pathname.replace(/\/$/, '');
            if (path === '/admin') {
                return response;
            }
            return NextResponse.redirect(new URL('/student/login', request.url))
        }

        const userEmail = session.user.email?.toLowerCase();
        const adminEmail = '506casm@gmail.com'.toLowerCase();

        if (userEmail !== adminEmail) {
            return NextResponse.redirect(new URL('/student/dashboard', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/students/:path*',
        '/tutors/:path*',
        '/subjects/:path*',
    ],
}
