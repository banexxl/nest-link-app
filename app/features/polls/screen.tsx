// app/main/polls.tsx
import { useAuth } from '@/context/auth-context';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

type PollAttachment = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

type Poll = {
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

type PollVote = {
  id: string;
  choice_option_ids: string[] | null;
  abstain: boolean;
};

const PollsScreen: React.FC = () => {
  const { tenantId } = useAuth();
  const userId = tenantId ?? null; // use tenant id for FK to tblTenants

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const selectedPoll = useMemo(
    () => polls.find((p) => p.id === selectedPollId) ?? null,
    [polls, selectedPollId]
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [abstain, setAbstain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string | null>(null);

  const [existingVote, setExistingVote] = useState<PollVote | null>(null);

  // Load polls (only active/open)
  useEffect(() => {
    const fetchPolls = async () => {
      setLoading(true);
      setError(null);
      try {
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
          // ⬇️ adjust these filters to your enum / RLS logic
          .eq('status', 'active') // or 'active' / 'published' depending on poll_status enum
          .order('starts_at', { ascending: true });

        if (error) {
          setError(error.message);
          setPolls([]);
        } else {
          const result = (data ?? []) as Poll[];
          setPolls(result);
          // auto-select first poll if none selected
          if (!selectedPollId && result.length > 0) {
            setSelectedPollId(result[0].id);
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load polls.');
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  // When poll changes, reset vote UI & load existing vote (if any)
  useEffect(() => {
    const loadExistingVote = async () => {
      if (!selectedPoll || !userId) {
        setExistingVote(null);
        setSelectedOptionId(null);
        setAbstain(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tblPollVotes')
          .select('id, choice_option_ids, abstain')
          .eq('poll_id', selectedPoll.id)
          .eq('tenant_id', userId) // TODO: if you use tenants table, replace with tenant id
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // ignore "no rows" error
          console.log('Error loading existing vote:', error);
        }

        if (data) {
          const vote = data as PollVote;
          setExistingVote(vote);
          // For single-choice UI, take the first selected id if present
          setSelectedOptionId(vote.choice_option_ids?.[0] ?? null);
          setAbstain(vote.abstain);
        } else {
          setExistingVote(null);
          setSelectedOptionId(null);
          setAbstain(false);
        }
      } catch (err) {
        setExistingVote(null);
        setSelectedOptionId(null);
        setAbstain(false);
      }
    };

    loadExistingVote();
    setVoteMessage(null);
  }, [selectedPoll, userId]);

  const handleSelectPoll = (pollId: string) => {
    setSelectedPollId(pollId);
  };

  const handleSelectOption = (optionId: string) => {
    if (!selectedPoll) return;
    setVoteMessage(null);
    setAbstain(false);

    // single-choice only for now
    setSelectedOptionId(optionId);
  };

  const handleToggleAbstain = () => {
    if (!selectedPoll || !selectedPoll.allow_abstain) return;
    setVoteMessage(null);
    setAbstain((prev) => !prev);
    if (!abstain) {
      setSelectedOptionId(null);
    }
  };

  const handleOpenAttachment = async (att: PollAttachment) => {
    if (!att.storage_bucket || !att.storage_path) return;
    const url = await signFileUrl({
      bucket: att.storage_bucket,
      path: att.storage_path,
      ttlSeconds: 60 * 20,
    });
    if (!url) return;

    Linking.openURL(url).catch((err) =>
      console.log('Failed to open attachment URL:', err
      ))
  };

  const handleSubmitVote = async () => {
    if (!selectedPoll || !userId) return;

    setVoteMessage(null);

    if (!abstain && !selectedOptionId) {
      setVoteMessage('Please select an option or abstain.');
      return;
    }

    // If user already voted and can't change, block
    if (existingVote && !selectedPoll.allow_change_until_deadline) {
      setVoteMessage('You have already voted on this poll.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: {
        poll_id: string;
        tenant_id: string;
        choice_option_ids: string[] | null;
        abstain: boolean;
      } = {
        poll_id: selectedPoll.id,
        tenant_id: userId,
        choice_option_ids:
          abstain ? null : selectedOptionId ? [selectedOptionId] : null,
        abstain,
      };

      let error = null;

      if (existingVote) {
        const { error: updateError } = await supabase
          .from('tblPollVotes')
          .update(payload)
          .eq('id', existingVote.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tblPollVotes')
          .insert(payload);
        error = insertError;
      }

      if (error) {
        setVoteMessage(error.message ?? 'Failed to submit vote.');
      } else {
        setVoteMessage('Your vote has been recorded.');
        // reload local state to reflect latest vote
        setExistingVote({
          id: existingVote?.id ?? 'temp',
          choice_option_ids: payload.choice_option_ids,
          abstain: payload.abstain,
        });
      }
    } catch (err: any) {
      setVoteMessage(err?.message ?? 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPollItem = ({ item }: { item: Poll }) => {
    const isSelected = item.id === selectedPollId;
    const hasEnded =
      item.ends_at && new Date(item.ends_at).getTime() < Date.now();

    return (
      <TouchableOpacity
        style={[
          styles.pollCard,
          isSelected && styles.pollCardSelected,
          hasEnded && styles.pollCardEnded,
        ]}
        onPress={() => handleSelectPoll(item.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.pollTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.pollDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.pollMetaRow}>
          <Text style={styles.pollMetaText}>
            {item.starts_at
              ? new Date(item.starts_at).toLocaleDateString()
              : 'No start date'}
          </Text>
          {hasEnded && <Text style={styles.pollEndedLabel}>Ended</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderOption = (option: { id: string; label: string; sort_order: number }) => {
    const isSelected = option.id === selectedOptionId;
    return (
      <TouchableOpacity
        key={option.id}
        style={styles.optionRow}
        onPress={() => handleSelectOption(option.id)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.radioOuter,
            isSelected && styles.radioOuterSelected,
          ]}
        >
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.optionLabel}>{option.label}</Text>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Poll list */}
      <View style={styles.pollListContainer}>
        <Text style={styles.sectionTitle}>Active polls</Text>
        {polls.length > 0 ? (
          <FlatList
            data={polls}
            keyExtractor={(item) => item.id}
            renderItem={renderPollItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 12 }}
          />
        ) : (
          <Text style={styles.emptyText}>No active polls.</Text>
        )}
      </View>

      {/* Selected poll details */}
      <View style={styles.detailsContainer}>
        {selectedPoll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.detailsTitle}>{selectedPoll.title}</Text>
            {selectedPoll.description ? (
              <Text style={styles.detailsDescription}>
                {selectedPoll.description}
              </Text>
            ) : null}

            {/* Attachments */}
            {selectedPoll.attachments &&
              selectedPoll.attachments.length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.attachmentsTitle}>Attachments</Text>
                  {selectedPoll.attachments.map((att, index) => (
                    <TouchableOpacity
                      key={att.id}
                      style={styles.attachmentButton}
                      onPress={() => handleOpenAttachment(att)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.attachmentButtonText}>
                        {`Attachment ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            {/* Options */}
            <View style={styles.optionsSection}>
              <Text style={styles.optionsTitle}>Options</Text>
              {selectedPoll.poll_options &&
                selectedPoll.poll_options.length > 0 ? (
                selectedPoll.poll_options
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map(renderOption)
              ) : (
                <Text style={styles.emptyText}>
                  No options defined for this poll.
                </Text>
              )}
            </View>

            {/* Abstain */}
            {selectedPoll.allow_abstain && (
              <TouchableOpacity
                style={styles.abstainRow}
                onPress={handleToggleAbstain}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxOuter,
                    abstain && styles.checkboxOuterSelected,
                  ]}
                >
                  {abstain && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.abstainLabel}>Abstain from voting</Text>
              </TouchableOpacity>
            )}

            {/* Vote message */}
            {voteMessage ? (
              <Text
                style={[
                  styles.voteMessage,
                  voteMessage.includes('recorded')
                    ? styles.voteMessageSuccess
                    : styles.voteMessageError,
                ]}
              >
                {voteMessage}
              </Text>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.voteButton,
                submitting && styles.voteButtonDisabled,
              ]}
              onPress={handleSubmitVote}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.voteButtonText}>
                  {existingVote ? 'Update vote' : 'Submit vote'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Select a poll above to view and vote.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default PollsScreen;

const styles = StyleSheet.create({
  root: {
    marginTop: 30,
    flex: 1,
    backgroundColor: '#f4f4f7',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  pollListContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  pollCard: {
    width: 220,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  pollCardSelected: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  pollCardEnded: {
    opacity: 0.6,
  },
  pollTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  pollDescription: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  pollMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollMetaText: {
    fontSize: 11,
    color: '#777',
  },
  pollEndedLabel: {
    fontSize: 11,
    color: '#d00',
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  detailsDescription: {
    fontSize: 13,
    color: '#444',
    marginBottom: 10,
  },
  attachmentsSection: {
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  attachmentButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f7f7fb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    marginBottom: 6,
  },
  attachmentButtonText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  optionsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: PRIMARY_COLOR,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_COLOR,
  },
  optionLabel: {
    fontSize: 13,
    color: '#333',
  },
  abstainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxOuterSelected: {
    borderColor: PRIMARY_COLOR,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: PRIMARY_COLOR,
  },
  abstainLabel: {
    fontSize: 13,
    color: '#333',
  },
  voteButton: {
    marginTop: 6,
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  voteButtonDisabled: {
    opacity: 0.7,
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  voteMessage: {
    marginTop: 4,
    fontSize: 12,
  },
  voteMessageSuccess: {
    color: '#0a7a0a',
  },
  voteMessageError: {
    color: '#d00',
  },
});
