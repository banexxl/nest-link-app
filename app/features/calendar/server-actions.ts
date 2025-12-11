import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { supabase } from '@/lib/supabase';

export type CalendarEvent = {
  id: string;
  title: string | null;
  description: string | null;
  all_day: boolean;
  start_date_time: string;
  end_date_time: string | null;
  calendar_event_type: string | null;
  building_id: string | null;
};

export async function resolveCalendarBuilding(userId: string) {
  const result = await getBuildingIdFromUserId(supabase, userId);

  if (!result.success || !result.data) {
    return {
      buildingId: null as string | null,
      error: result.error ?? 'Unable to determine building for this tenant.',
    };
  }

  return { buildingId: result.data.buildingId as string, error: null as string | null };
}

export async function fetchCalendarEvents(buildingId: string) {
  const { data, error } = await supabase
    .from('tblCalendarEvents')
    .select(
      `
      id,
      title,
      description,
      all_day,
      start_date_time,
      end_date_time,
      calendar_event_type,
      building_id
    `
    )
    .eq('building_id', buildingId)
    .order('start_date_time', { ascending: true });

  if (error) {
    return { events: [] as CalendarEvent[], error: error.message };
  }

  return { events: (data ?? []) as CalendarEvent[], error: null as string | null };
}
