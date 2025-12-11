import { getBuildingIdFromUserId, getClientIdFromAuthUser, type ClientResolution } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';

export type IncidentCategory =
  | 'plumbing'
  | 'electrical'
  | 'noise'
  | 'cleaning'
  | 'common_area'
  | 'heating'
  | 'cooling'
  | 'structural'
  | 'interior'
  | 'outdoorsafety'
  | 'security'
  | 'pests'
  | 'administrative'
  | 'parking'
  | 'it'
  | 'waste';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent' | string;

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | string;

export type IncidentImage = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export type IncidentComment = {
  id: string;
  user_id: string | null;
  message: string | null;
  created_at: string;
};

export type Incident = {
  id: string;
  client_id: string | null;
  building_id: string | null;
  apartment_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  is_emergency: boolean;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  reported_by: string | null;
  images?: IncidentImage[];
  comments?: IncidentComment[];
};

export type NewIncidentForm = {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  is_emergency: boolean;
};

export async function resolveIssuesBuilding(userId: string) {
  const result = await getBuildingIdFromUserId(supabase, userId);

  if (!result.success || !result.data) {
    return {
      buildingId: null as string | null,
      error: result.error ?? 'Unable to determine building for this tenant.',
    };
  }

  return { buildingId: result.data.buildingId as string, error: null as string | null };
}

export async function fetchIncidents(profileId: string, buildingId: string) {
  const { data, error } = await supabase
    .from('tblIncidentReports')
    .select(
      `
      id,
      client_id,
      building_id,
      apartment_id,
      assigned_to,
      title,
      description,
      category,
      priority,
      status,
      is_emergency,
      created_at,
      resolved_at,
      closed_at,
      reported_by,
      images:tblIncidentReportImages (
        id,
        storage_bucket,
        storage_path
      ),
      comments:tblIncidentReportComments (
        id,
        user_id,
        message,
        created_at
      )
    `
    )
    // .eq('reported_by', profileId)
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (error) {
    return { incidents: [] as Incident[], error: error.message };
  }

  const result = (data ?? []) as Incident[];
  return { incidents: result, error: null as string | null };
}

export async function prefetchIncidentImageUrls(images: IncidentImage[], cached: Record<string, string>) {
  const toSign: { key: string; bucket: string; path: string }[] = [];

  images.forEach((img) => {
    if (!img.storage_bucket || !img.storage_path) return;
    const key = `${img.storage_bucket}:${img.storage_path}`;
    if (cached[key]) return;
    if (toSign.find((item) => item.key === key)) return;
    toSign.push({
      key,
      bucket: img.storage_bucket,
      path: img.storage_path,
    });
  });

  if (!toSign.length) {
    return {} as Record<string, string>;
  }

  const newMap: Record<string, string> = {};

  for (const item of toSign) {
    const url = await signFileUrl({
      bucket: item.bucket,
      path: item.path,
      ttlSeconds: 60 * 20,
    });
    if (url) {
      newMap[item.key] = url;
    }
  }

  return newMap;
}

export async function signIncidentImage(ref: IncidentImage, ttlSeconds = 60 * 20) {
  if (!ref.storage_bucket || !ref.storage_path) return null;

  return signFileUrl({
    bucket: ref.storage_bucket,
    path: ref.storage_path,
    ttlSeconds,
  });
}

export async function fetchCommentAuthors(userIds: string[]) {
  if (!userIds.length) {
    return { authors: {} as Record<string, string>, error: null as string | null };
  }

  const { data, error } = await supabase
    .from('tblTenants')
    .select('user_id, full_name')
    .in('user_id', userIds);

  if (error || !data) {
    return { authors: {} as Record<string, string>, error: error ? error.message : null };
  }

  const authors: Record<string, string> = {};
  (data as any[]).forEach((row) => {
    const uid = row.user_id as string | null;
    const name = (row.full_name as string | null) ?? null;
    if (uid && name) {
      authors[uid] = name;
    }
  });

  return { authors, error: null as string | null };
}

export async function resolveClientForUser(userId: string): Promise<ClientResolution> {
  return getClientIdFromAuthUser(supabase, userId);
}

export async function createIncidentRecord(payload: {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  is_emergency: boolean;
  status: IncidentStatus;
  reported_by: string;
  client_id: string;
  building_id: string;
  apartment_id: string | null;
}) {
  const { data, error } = await supabase
    .from('tblIncidentReports')
    .insert(payload)
    .select(
      `
    id,
    client_id,
    building_id,
    apartment_id,
    assigned_to,
    title,
    description,
    category,
    priority,
    status,
    is_emergency,
    created_at,
    resolved_at,
    closed_at,
    reported_by,
    images:tblIncidentReportImages (
      id,
      storage_bucket,
      storage_path
    ),
    comments:tblIncidentReportComments (
      id,
      user_id,
      message,
      created_at
    )
  `
    )
    .single();

  if (error) {
    return { incident: null as Incident | null, error: error.message };
  }

  return { incident: data as Incident, error: null as string | null };
}

export async function createIncidentComment(payload: {
  incident_id: string;
  user_id: string;
  message: string;
}) {
  const { data, error } = await supabase
    .from('tblIncidentReportComments')
    .insert(payload)
    .select('id, user_id, message, created_at')
    .single();

  if (error) {
    return { comment: null as IncidentComment | null, error: error.message };
  }

  return { comment: data as IncidentComment, error: null as string | null };
}
