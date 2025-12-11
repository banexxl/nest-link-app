import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';

export type PollAttachment = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export type Poll = {
  id: string;
  client_id: string | null;
  building_id: string | null;
  type: string;
  title: string;
  description: string | null;
  max_choices: number | null;
  allow_change_until_deadline: boolean;
  allow_abstain: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  poll_options?: {
    id: string;
    label: string;
    sort_order: number;
  }[];
  attachments?: PollAttachment[];
};

export type PollVote = {
  id: string;
  choice_option_ids: string[] | null;
  abstain: boolean;
};

export type PollVotePayload = {
  poll_id: string;
  tenant_id: string;
  choice_option_ids: string[] | null;
  abstain: boolean;
};

export async function resolvePollBuilding(userId: string) {
  const result = await getBuildingIdFromUserId(supabase, userId);

  if (!result.success || !result.data) {
    return {
      buildingId: null as string | null,
      error: result.error ?? 'Unable to determine building for this tenant.',
    };
  }

  return { buildingId: result.data.buildingId as string, error: null as string | null };
}

export async function fetchPollsForBuilding(buildingId: string) {
  const { data, error } = await supabase
    .from('tblPolls')
    .select(
      `
      id,
      client_id,
      building_id,
      type,
      title,
      description,
      max_choices,
      allow_change_until_deadline,
      allow_abstain,
      status,
      starts_at,
      ends_at,
      poll_options:tblPollOptions (
        id,
        label,
        sort_order
      ),
      attachments:tblPollAttachments (
        id,
        storage_bucket,
        storage_path
      )
    `
    )
    .in('status', ['active', 'closed'])
    .eq('building_id', buildingId)
    .order('starts_at', { ascending: true });

  if (error) {
    return { polls: [] as Poll[], error: error.message };
  }

  return { polls: (data ?? []) as Poll[], error: null as string | null };
}

export async function fetchExistingPollVote(pollId: string, tenantPk: string) {
  const { data, error } = await supabase
    .from('tblPollVotes')
    .select('id, choice_option_ids, abstain')
    .eq('poll_id', pollId)
    .eq('tenant_id', tenantPk)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { vote: null as PollVote | null, error: error.message };
  }

  return {
    vote: (data as PollVote | null) ?? null,
    error: null as string | null,
  };
}

export async function fetchPollVotes(pollId: string) {
  const { data, error } = await supabase
    .from('tblPollVotes')
    .select('choice_option_ids, abstain')
    .eq('poll_id', pollId);

  if (error) {
    return {
      votes: [] as { choice_option_ids: string[] | null; abstain: boolean }[],
      error: error.message,
    };
  }

  return {
    votes: (data ??
      []) as {
        choice_option_ids: string[] | null;
        abstain: boolean;
      }[],
    error: null as string | null,
  };
}

export async function submitPollVote(payload: PollVotePayload, existingVoteId?: string | null) {
  if (existingVoteId) {
    const { error } = await supabase
      .from('tblPollVotes')
      .update(payload)
      .eq('id', existingVoteId);

    return { error: error ? error.message : null };
  }

  const { error } = await supabase.from('tblPollVotes').insert(payload);
  return { error: error ? error.message : null };
}

export async function signPollAttachment(att: PollAttachment) {
  if (!att.storage_bucket || !att.storage_path) return null;

  return signFileUrl({
    bucket: att.storage_bucket,
    path: att.storage_path,
    ttlSeconds: 60 * 20,
  });
}
