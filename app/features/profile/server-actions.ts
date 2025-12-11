import { getTenantAddressFromTenantId, type TenantAddressInfo } from '@/lib/sb-tenant';
import { supabase } from '@/lib/supabase';

export type AvatarLoadParams = {
  sessionUserId: string | null;
  tenantId: string | null;
};

export type AvatarLoadResult = {
  avatarUrl: string | null;
  resolvedTenantId: string | null;
  error: string | null;
};

export type UpdateAvatarParams = {
  sessionUserId: string | null;
  tenantId: string | null;
  resolvedTenantId: string | null;
  avatarPath: string;
};

export async function loadAvatarData(params: AvatarLoadParams): Promise<AvatarLoadResult> {
  const { sessionUserId, tenantId } = params;

  if (!sessionUserId && !tenantId) {
    return { avatarUrl: null, resolvedTenantId: null, error: null };
  }

  const tenantFilterColumn = tenantId ? 'id' : 'user_id';
  const tenantFilterValue = tenantId ?? sessionUserId;

  if (!tenantFilterValue) {
    return {
      avatarUrl: null,
      resolvedTenantId: null,
      error: 'Missing tenant information.',
    };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tblTenants')
    .select('id, avatar_url')
    .eq(tenantFilterColumn, tenantFilterValue)
    .maybeSingle();

  if (tenantError && tenantError.code !== 'PGRST116') {
    return {
      avatarUrl: null,
      resolvedTenantId: null,
      error: tenantError.message,
    };
  }

  const resolvedTenantId = tenantId ?? ((tenant?.id as string | undefined) ?? null);
  let avatarUrl = (tenant?.avatar_url as string | null | undefined) ?? null;
  let error: string | null = null;

  if (resolvedTenantId) {
    const { data: profile, error: profileError } = await supabase
      .from('tblTenantProfiles')
      .select('avatar_url')
      .eq('tenant_id', resolvedTenantId)
      .maybeSingle();

    if (!profileError && profile?.avatar_url) {
      avatarUrl = profile.avatar_url as string;
    } else if (profileError && profileError.code !== 'PGRST116') {
      error = profileError.message;
    }
  }

  return { avatarUrl, resolvedTenantId, error };
}

export async function updateAvatarData(params: UpdateAvatarParams) {
  const { sessionUserId, tenantId, resolvedTenantId, avatarPath } = params;

  const targetTenantId = resolvedTenantId ?? tenantId ?? null;
  const tenantFilterColumn = targetTenantId ? 'id' : 'user_id';
  const tenantFilterValue = targetTenantId ?? sessionUserId;

  if (!tenantFilterValue) {
    return { error: 'Missing tenant information for avatar update.', resolvedTenantId: targetTenantId };
  }

  const { error: tenantUpdateError } = await supabase
    .from('tblTenants')
    .update({ avatar_url: avatarPath })
    .eq(tenantFilterColumn, tenantFilterValue);

  let profileError: string | null = null;

  if (targetTenantId) {
    const { error: profileUpdateError } = await supabase
      .from('tblTenantProfiles')
      .update({ avatar_url: avatarPath })
      .eq('tenant_id', targetTenantId);

    if (profileUpdateError) {
      profileError = profileUpdateError.message;
    }
  }

  const combinedError = tenantUpdateError?.message ?? profileError ?? null;

  return { error: combinedError, resolvedTenantId: targetTenantId };
}

export async function fetchTenantAddress(tenantId: string) {
  const result = await getTenantAddressFromTenantId(supabase, tenantId);

  if (!result.success || !result.data) {
    return {
      address: null as TenantAddressInfo | null,
      error: result.error ?? 'Failed to load tenant address.',
    };
  }

  return { address: result.data, error: null as string | null };
}

export type { TenantAddressInfo };
