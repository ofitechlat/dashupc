-- =============================================
-- MOTOR DE DETECCIÓN DE CONFLICTOS PARA TUTORES
-- =============================================

CREATE OR REPLACE FUNCTION public.check_tutor_conflicts(
    p_tutor_id UUID,
    p_schedule_config JSONB,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_workshop_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_type TEXT,
    conflict_name TEXT,
    conflict_date DATE,
    conflict_start_time TEXT,
    conflict_end_time TEXT
) AS $$
DECLARE
    slot RECORD;
BEGIN
    -- Iterar por cada slot del horario propuesto (schedule_config)
    FOR slot IN SELECT * FROM jsonb_to_recordset(p_schedule_config) AS x(day TEXT, startTime TEXT, endTime TEXT)
    LOOP
        -- 1. Verificar conflictos con CLASES INDIVIDUALES
        RETURN QUERY
        SELECT 
            'clase_individual'::TEXT,
            s.name::TEXT,
            c.scheduled_at::DATE,
            TO_CHAR(c.scheduled_at, 'HH24:MI'),
            TO_CHAR(c.scheduled_at + (c.duration_minutes || ' minutes')::interval, 'HH24:MI')
        FROM public.classes c
        JOIN public.subjects s ON c.subject_id = s.id
        WHERE c.tutor_id = p_tutor_id
        AND c.scheduled_at::DATE >= p_start_date
        AND c.scheduled_at::DATE <= p_end_date
        AND public.get_spanish_day(c.scheduled_at) = slot.day
        AND (
            (TO_CHAR(c.scheduled_at, 'HH24:MI') < slot.endTime AND TO_CHAR(c.scheduled_at + (c.duration_minutes || ' minutes')::interval, 'HH24:MI') > slot.startTime)
        );

        -- 2. Verificar conflictos con OTROS GRUPOS DE TALLER
        RETURN QUERY
        SELECT 
            'taller_grupal'::TEXT,
            wg.name::TEXT,
            NULL::DATE, -- No hay una fecha específica, es recurrente
            gs.startTime::TEXT,
            gs.endTime::TEXT
        FROM public.workshop_groups wg,
        LATERAL jsonb_to_recordset(wg.schedule_config) AS gs(day TEXT, startTime TEXT, endTime TEXT)
        WHERE wg.tutor_id = p_tutor_id
        AND wg.id != COALESCE(p_exclude_workshop_id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND wg.status IN ('planning', 'active')
        AND wg.start_date <= p_end_date
        AND wg.end_date >= p_start_date
        AND gs.day = slot.day
        AND (gs.startTime < slot.endTime AND gs.endTime > slot.startTime);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar para obtener el día en español
CREATE OR REPLACE FUNCTION public.get_spanish_day(p_date TIMESTAMP WITH TIME ZONE)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE EXTRACT(DOW FROM p_date)
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
    END;
END;
$$ LANGUAGE plpgsql;
