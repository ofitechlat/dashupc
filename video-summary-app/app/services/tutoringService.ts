import { supabase } from '../utils/supabase';

export interface OptimizationData {
    students: any[];
    tutors: any[];
    subjects: any[];
    terms: any[];
}

export const tutoringService = {

    // Fetch all data required for the optimizer
    async fetchOptimizationData(): Promise<OptimizationData> {
        console.log("🔄 Fetching real data from Supabase...");

        // 1. Fetch Subjects
        const { data: subjects, error: subjError } = await supabase
            .from('subjects')
            .select('*');
        if (subjError) throw subjError;

        // Create a map of UUID -> Code for easy reference
        const subjectMap = new Map(subjects.map(s => [s.id, s.code || s.name]));

        // 2. Fetch Tutors
        const { data: tutors, error: tutorError } = await supabase
            .from('tutors')
            .select('*');
        if (tutorError) throw tutorError;

        // Transform Tutors
        const formattedTutors = tutors.map(t => ({
            id: t.id,
            name: t.name,
            phone: t.phone || 'N/A', // FIX: Map phone
            rate: t.hourly_rate,
            availability: t.availability || [],
            // Convert UUIDs to Codes if possible, or keep UUIDs
            specialties: (t.subject_ids || []).map((id: string) => subjectMap.get(id) || id),
            max_hours: t.max_hours
        }));

        // 3. Fetch Students & Their Requests
        const { data: students, error: studError } = await supabase
            .from('students')
            .select(`
                *,
                course_requests (
                    subject_id,
                    status
                ),
                terms (
                    id,
                    name
                )
            `);
        if (studError) throw studError;

        // Transform Students
        const formattedStudents = students.map(s => {
            // Extract approved/pending subjects
            const requestedSubjects = (s.course_requests || [])
                .filter((r: any) => r.status !== 'rejected' && r.status !== 'cancelled')
                .map((r: any) => subjectMap.get(r.subject_id) || r.subject_id);

            return {
                id: s.id,
                name: s.name,
                phone: s.phone || 'N/A', // FIX: Map phone
                level: s.level || 'III Ciclo', // FIX: Use real level if available
                subjects: requestedSubjects,
                availability: s.availability || [],
                term_id: s.term_id,
                revenue: s.total_revenue || 45000 // FIX: Use real revenue or base fallback
            };
        });

        // 4. Fetch Terms
        const { data: terms, error: termError } = await supabase
            .from('terms')
            .select('*')
            .eq('is_active', true);
        if (termError) throw termError;

        return {
            students: formattedStudents,
            tutors: formattedTutors,
            subjects: subjects.map(s => ({ id: s.code || s.id, name: s.name, price: s.group_price })),
            terms: terms || []
        };
    }
};
