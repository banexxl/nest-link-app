import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';

export type TenantPostImage = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export type TenantPostLike = {
  id: string;
  post_id: string;
  tenant_id: string | null;
  created_at: string;
  emoji: string | null;
};

export type TenantPostCommentLike = {
  id: string;
  comment_id: string;
  tenant_id: string | null;
  created_at: string;
  emoji: string | null;
};

export type TenantPostComment = {
  id: string;
  post_id: string;
  tenant_id: string | null;
  profile_id: string | null;
  comment_text: string | null;
  created_at: string;
  client_id: string | null;
  building_id: string | null;
  likes?: TenantPostCommentLike[];
};

export type TenantPost = {
  id: string;
  content_text: string | null;
  created_at: string;
  building_id: string | null;
  is_archived: boolean;
  profile_id: string | null;
  tenant_id: string | null;
  images?: TenantPostImage[];
  likes?: TenantPostLike[];
  comments?: TenantPostComment[];
};

export async function resolveChatBuilding(userId: string) {
  const result = await getBuildingIdFromUserId(supabase, userId);

  if (!result.success || !result.data) {
    return {
      buildingId: null as string | null,
      error: result.error ?? 'Unable to determine building for this tenant.',
    };
  }

  return { buildingId: result.data.buildingId as string, error: null as string | null };
}

export async function resolveTenant(userId: string) {
  const { data, error } = await supabase
    .from('tblTenants')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { tenantId: null as string | null, error: error?.message ?? null };
  }

  return { tenantId: (data as any).id as string, error: null as string | null };
}

export async function resolveTenantAndProfile(userId: string) {
  const tenantResult = await resolveTenant(userId);
  if (!tenantResult.tenantId) {
    return { tenantId: null as string | null, profileId: null as string | null, error: tenantResult.error ?? 'Could not resolve tenant for this user.' };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('tblTenantProfiles')
    .select('id')
    .eq('tenant_id', tenantResult.tenantId)
    .single();

  if (profileError || !profileRow) {
    return {
      tenantId: tenantResult.tenantId,
      profileId: null as string | null,
      error: profileError?.message ?? 'Could not resolve tenant profile for this user.',
    };
  }

  return {
    tenantId: tenantResult.tenantId,
    profileId: (profileRow as any).id as string,
    error: null as string | null,
  };
}

export async function fetchTenantPosts(buildingId: string, from: number, to: number) {
  const { data, error } = await supabase
    .from('tblTenantPosts')
    .select(
      `
      id,
      content_text,
      created_at,
      building_id,
      is_archived,
      profile_id,
      tenant_id,
      images:tblTenantPostImages (
        id,
        storage_bucket,
        storage_path
      ),
      likes:tblTenantPostLikes (
        id,
        post_id,
        tenant_id,
        created_at,
        emoji
      ),
      comments:tblTenantPostComments (
        id,
        post_id,
        tenant_id,
        profile_id,
        comment_text,
        created_at,
        client_id,
        building_id,
        likes:tblTenantPostCommentLikes (
          id,
          comment_id,
          tenant_id,
          created_at,
          emoji
        )
      )
    `
    )
    .eq('building_id', buildingId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { posts: [] as TenantPost[], error: error.message };
  }

  return { posts: (data ?? []) as TenantPost[], error: null as string | null };
}

export async function createTenantPost(payload: {
  content_text: string | null;
  building_id: string;
  is_archived: boolean;
  profile_id: string;
  tenant_id: string;
}) {
  const { data, error } = await supabase
    .from('tblTenantPosts')
    .insert(payload)
    .select(
      `
      id,
      content_text,
      created_at,
      building_id,
      is_archived,
      profile_id,
      tenant_id,
      images:tblTenantPostImages (
        id,
        storage_bucket,
        storage_path
      ),
      likes:tblTenantPostLikes (
        id,
        post_id,
        tenant_id,
        created_at,
        emoji
      ),
      comments:tblTenantPostComments (
        id,
        post_id,
        tenant_id,
        profile_id,
        comment_text,
        created_at,
        client_id,
        building_id,
        likes:tblTenantPostCommentLikes (
          id,
          comment_id,
          tenant_id,
          created_at,
          emoji
        )
      )
    `
    )
    .single();

  if (error) {
    return { post: null as TenantPost | null, error: error.message };
  }

  return { post: data as TenantPost, error: null as string | null };
}

export async function removePostLike(likeId: string) {
  const { error } = await supabase
    .from('tblTenantPostLikes')
    .delete()
    .eq('id', likeId);

  return { error: error ? error.message : null };
}

export async function addPostLike(payload: { post_id: string; tenant_id: string; emoji: string | null }) {
  const { data, error } = await supabase
    .from('tblTenantPostLikes')
    .insert(payload)
    .select('id, post_id, tenant_id, created_at, emoji')
    .single();

  if (error) {
    return { like: null as TenantPostLike | null, error: error.message };
  }

  return { like: data as TenantPostLike, error: null as string | null };
}

export async function addPostComment(payload: {
  post_id: string;
  tenant_id: string;
  profile_id: string;
  comment_text: string;
  client_id: string | null;
  building_id: string;
}) {
  const { data, error } = await supabase
    .from('tblTenantPostComments')
    .insert(payload)
    .select(
      `
      id,
      post_id,
      tenant_id,
      profile_id,
      comment_text,
      created_at,
      client_id,
      building_id,
      likes:tblTenantPostCommentLikes (
        id,
        comment_id,
        tenant_id,
        created_at,
        emoji
      )
    `
    )
    .single();

  if (error) {
    return { comment: null as TenantPostComment | null, error: error.message };
  }

  return { comment: data as TenantPostComment, error: null as string | null };
}

export async function removeCommentLike(likeId: string) {
  const { error } = await supabase
    .from('tblTenantPostCommentLikes')
    .delete()
    .eq('id', likeId);

  return { error: error ? error.message : null };
}

export async function addCommentLike(payload: { comment_id: string; tenant_id: string; emoji: string | null }) {
  const { data, error } = await supabase
    .from('tblTenantPostCommentLikes')
    .insert(payload)
    .select('id, comment_id, tenant_id, created_at, emoji')
    .single();

  if (error) {
    return { like: null as TenantPostCommentLike | null, error: error.message };
  }

  return { like: data as TenantPostCommentLike, error: null as string | null };
}

export async function fetchTenantNamesByIds(ids: string[]) {
  if (!ids.length) {
    return { names: [] as string[], error: null as string | null };
  }

  const { data, error } = await supabase
    .from('tblTenants')
    .select('id, first_name, last_name')
    .in('id', ids);

  if (error || !data) {
    return { names: ids, error: error ? error.message : null };
  }

  const names = ids.map((id) => {
    const row = (data as any[]).find((t) => t.id === id) as
      | { id: string; first_name?: string | null; last_name?: string | null }
      | undefined;
    const first = row?.first_name ?? '';
    const last = row?.last_name ?? '';
    const full = `${first} ${last}`.trim();
    return full || 'Unknown tenant';
  });

  return { names, error: null as string | null };
}

export async function prefetchPostImageUrls(posts: TenantPost[], cached: Record<string, string>) {
  const toSign: { key: string; bucket: string; path: string }[] = [];

  posts.forEach((post) => {
    (post.images ?? []).forEach((img) => {
      if (!img.storage_bucket || !img.storage_path) return;
      const key = `${img.storage_bucket}:${img.storage_path}`;
      if (cached[key]) return;
      if (toSign.find((item) => item.key === key)) return;
      toSign.push({ key, bucket: img.storage_bucket, path: img.storage_path });
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
