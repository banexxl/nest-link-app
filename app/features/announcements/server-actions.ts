import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';

export type StorageRef = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  category: string | null;
  subcategory: string | null;
  pinned: boolean;
  archived: boolean;
  status: string;
  created_at: string;
  images?: StorageRef[];
  docs?: StorageRef[];
};

export async function resolveAnnouncementBuilding(userId: string) {
  const result = await getBuildingIdFromUserId(supabase, userId);

  if (!result.success || !result.data) {
    return {
      buildingId: null as string | null,
      error: result.error ?? 'Unable to determine building for this tenant.',
    };
  }

  return { buildingId: result.data.buildingId as string, error: null as string | null };
}

export async function fetchAnnouncementsForBuilding(buildingId: string) {
  const { data: linkRows, error: linkError } = await supabase
    .from('tblBuildings_Announcements')
    .select('announcement_id')
    .eq('building_id', buildingId);

  if (linkError) {
    return { announcements: [] as Announcement[], error: linkError.message };
  }

  const ids = (linkRows ?? [])
    .map((row: any) => row.announcement_id as string | null)
    .filter((id): id is string => !!id);

  if (!ids.length) {
    return { announcements: [] as Announcement[], error: null as string | null };
  }

  const { data, error } = await supabase
    .from('tblAnnouncements')
    .select(`
      id,
      title,
      message,
      category,
      subcategory,
      pinned,
      archived,
      status,
      created_at,
      images:tblAnnouncementImages (
        id,
        storage_bucket,
        storage_path
      ),
      docs:tblAnnouncementDocuments (
        id,
        storage_bucket,
        storage_path
      )
    `)
    .in('id', ids)
    .eq('archived', false)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { announcements: [] as Announcement[], error: error.message };
  }

  return {
    announcements: (data ?? []) as Announcement[],
    error: null as string | null,
  };
}

export async function prefetchAnnouncementSignedUrls(
  announcements: Announcement[],
  cached: Record<string, string>
) {
  const toSign: { key: string; bucket: string; path: string }[] = [];

  announcements.forEach((announcement) => {
    const refs = [...(announcement.images ?? []), ...(announcement.docs ?? [])];
    refs.forEach((ref) => {
      if (!ref.storage_bucket || !ref.storage_path) return;
      const key = `${ref.storage_bucket}:${ref.storage_path}`;
      if (cached[key]) return;
      if (toSign.find((item) => item.key === key)) return;
      toSign.push({ key, bucket: ref.storage_bucket, path: ref.storage_path });
    });
  });

  if (!toSign.length) {
    return {} as Record<string, string>;
  }

  const newMap: Record<string, string> = {};

  for (const item of toSign) {
    const url = await signFileUrl(
      {
        bucket: item.bucket,
        path: item.path,
      },
      true
    );

    if (url) {
      newMap[item.key] = url;
    }
  }

  return newMap;
}

export async function signAnnouncementRef(ref: StorageRef, ttlSeconds?: number) {
  if (!ref.storage_bucket || !ref.storage_path) return null;

  return signFileUrl({
    bucket: ref.storage_bucket,
    path: ref.storage_path,
    ttlSeconds,
  });
}
