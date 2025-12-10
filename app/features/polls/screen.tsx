// app/main/polls.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

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

type PollResults = {
  options: {
    optionId: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  abstainCount: number;
  abstainPercentage: number;
  totalSelections: number;
};

const PollsScreen: React.FC = () => {
  const { session, tenantId } = useAuth();
  const { handleScroll } = useTabBarScroll();
  const tenantPk = tenantId ?? null; // FK to tblTenants in votes
  const authUserId = session?.user.id ?? null;
  const { height: screenHeight } = useWindowDimensions();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  // aggregated results for closed polls
  const [pollResults, setPollResults] = useState<PollResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [buildingId, setBuildingId] = useState<string | null>(null);

  // Load polls (active + closed)
  const fetchPolls = useCallback(
    async (showLoading = true) => {
      if (!buildingId) return;

      if (showLoading) setLoading(true);
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
          // Load both active and closed polls for this building
          .in('status', ['active', 'closed'])
          .eq('building_id', buildingId)
          .order('starts_at', { ascending: true });

        if (error) {
          setError(error.message);
          setPolls([]);
        } else {
          const result = (data ?? []) as Poll[];
          setPolls(result);
          if (!selectedPollId && result.length > 0) {
            setSelectedPollId(result[0].id);
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load polls.');
        setPolls([]);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedPollId, buildingId]
  );

  useEffect(() => {
    if (buildingId) {
      fetchPolls(true);
    }
  }, [buildingId, fetchPolls]);

  // Resolve tenant's building for filtering polls
  useEffect(() => {
    const loadBuilding = async () => {
      if (!authUserId) {
        setError('You must be signed in to view polls.');
        setLoading(false);
        return;
      }

      try {
        const result = await getBuildingIdFromUserId(supabase, authUserId);
        if (!result.success || !result.data) {
          setError(result.error ?? 'Unable to determine building for this tenant.');
          setBuildingId(null);
          setLoading(false);
          return;
        }

        setBuildingId(result.data.buildingId);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to resolve building for this tenant.');
        setBuildingId(null);
        setLoading(false);
      }
    };

    loadBuilding();
  }, [authUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPolls(false);
  };

  // When poll changes, reset vote UI & load existing vote (if any)
  useEffect(() => {
    const loadExistingVote = async () => {
      if (!selectedPoll || !tenantPk) {
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
          .eq('tenant_id', tenantPk)
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
      } catch {
        setExistingVote(null);
        setSelectedOptionId(null);
        setAbstain(false);
      }
    };

    loadExistingVote();
    setVoteMessage(null);
  }, [selectedPoll, tenantPk]);

  // Load aggregated results when a closed poll is selected
  useEffect(() => {
    const loadResults = async () => {
      if (!selectedPoll) {
        setPollResults(null);
        return;
      }

      const hasEnded =
        !!selectedPoll.ends_at &&
        new Date(selectedPoll.ends_at).getTime() < Date.now();
      const isClosed = selectedPoll.status === 'closed' || hasEnded;

      if (!isClosed) {
        setPollResults(null);
        return;
      }

      try {
        setResultsLoading(true);

        const { data, error } = await supabase
          .from('tblPollVotes')
          .select('choice_option_ids, abstain')
          .eq('poll_id', selectedPoll.id);

        if (error) {
          console.log('Error loading poll results:', error);
          setPollResults(null);
          return;
        }

        const votes = (data ?? []) as { choice_option_ids: string[] | null; abstain: boolean }[];

        if (!votes.length || !selectedPoll.poll_options || !selectedPoll.poll_options.length) {
          setPollResults(null);
          return;
        }

        const optionMap: Record<
          string,
          { optionId: string; label: string; count: number }
        > = {};

        selectedPoll.poll_options.forEach((opt) => {
          optionMap[opt.id] = {
            optionId: opt.id,
            label: opt.label,
            count: 0,
          };
        });

        let totalSelections = 0;
        let abstainCount = 0;

        votes.forEach((v) => {
          if (v.abstain) {
            abstainCount += 1;
            return;
          }
          (v.choice_option_ids ?? []).forEach((id) => {
            if (!optionMap[id]) {
              // unknown option id; skip
              return;
            }
            optionMap[id].count += 1;
            totalSelections += 1;
          });
        });

        const grandTotal = totalSelections + abstainCount;
        if (grandTotal === 0) {
          setPollResults(null);
          return;
        }

        const baseColors = [
          '#FF6B6B',
          '#4ECDC4',
          '#FFD93D',
          '#1A535C',
          '#FF9F1C',
          '#9B5DE5',
          '#00BBF9',
          '#F15BB5',
        ];

        const options = Object.values(optionMap)
          .filter((o) => o.count > 0)
          .map((o, index) => {
            const percentage = (o.count / grandTotal) * 100;
            const color = baseColors[index % baseColors.length];
            return {
              optionId: o.optionId,
              label: o.label,
              count: o.count,
              percentage,
              color,
            };
          });

        const abstainPercentage =
          abstainCount > 0 ? (abstainCount / grandTotal) * 100 : 0;

        setPollResults({
          options,
          abstainCount,
          abstainPercentage,
          totalSelections: grandTotal,
        });
      } catch (err) {
        console.log('Unexpected error loading poll results:', err);
        setPollResults(null);
      } finally {
        setResultsLoading(false);
      }
    };

    loadResults();
  }, [selectedPoll]);

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
    if (!selectedPoll || !tenantPk) return;

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
        tenant_id: tenantPk,
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

  const hasSelectedPollEnded = selectedPoll
    ? !!selectedPoll.ends_at &&
    new Date(selectedPoll.ends_at).getTime() < Date.now()
    : false;
  const isSelectedPollClosed =
    !!selectedPoll && (selectedPoll.status === 'closed' || hasSelectedPollEnded);
  const detailsMaxHeight = useMemo(() => Math.max(screenHeight * 0.55, 340), [screenHeight]);

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
      <BackgroundScreen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </BackgroundScreen>
    );
  }

  if (loading && polls.length === 0) {
    return (
      <BackgroundScreen>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </BackgroundScreen>
    );
  }

  return (
    <BackgroundScreen>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Polls</Text>
        <Text style={styles.headerMeta}>{polls.length} polls</Text>
      </View>
      {/* Poll list card */}
      <View style={styles.pollListCard}>
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
          <Text style={styles.emptyText}>No polls yet.</Text>
        )}
      </View>

      {/* Selected poll details card */}
      <View style={[styles.detailsCard, { maxHeight: detailsMaxHeight }]}>
        {selectedPoll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ maxHeight: detailsMaxHeight - 28 }}
          >
            <Text style={styles.detailsTitle}>{selectedPoll.title}</Text>
            {isSelectedPollClosed && (
              <Text style={styles.detailsClosedLabel}>This poll is closed.</Text>
            )}
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

            {/* Options / voting or results */}
            {!isSelectedPollClosed ? (
              <>
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
              </>
            ) : (
              <>
                <View style={styles.resultsSection}>
                  <Text style={styles.resultsTitle}>Results</Text>
                  {resultsLoading ? (
                    <ActivityIndicator style={{ marginTop: 8 }} />
                  ) : pollResults ? (
                    <View style={styles.resultsRow}>
                      {(() => {
                        const allSlices = [
                          ...pollResults.options,
                          ...(pollResults.abstainCount > 0
                            ? [
                              {
                                optionId: 'abstain',
                                label: 'Abstain',
                                count: pollResults.abstainCount,
                                percentage: pollResults.abstainPercentage,
                                color: '#CCCCCC',
                              },
                            ]
                            : []),
                        ];

                        const data = allSlices.map((slice) => ({
                          value: slice.count,
                          color: slice.color,
                        }));

                        return (
                          <View style={styles.resultsBarContainer}>
                            <PieChart data={data} radius={70} />
                          </View>
                        );
                      })()}
                      <View style={styles.resultsLegend}>
                        {pollResults.options.map((opt) => (
                          <View
                            key={opt.optionId}
                            style={styles.legendRow}
                          >
                            <View
                              style={[
                                styles.legendColor,
                                { backgroundColor: opt.color },
                              ]}
                            />
                            <Text style={styles.legendLabel}>
                              {opt.label} — {opt.count} (
                              {opt.percentage.toFixed(1)}%)
                            </Text>
                          </View>
                        ))}
                        {pollResults.abstainCount > 0 && (
                          <View style={styles.legendRow}>
                            <View
                              style={[
                                styles.legendColor,
                                { backgroundColor: '#CCCCCC' },
                              ]}
                            />
                            <Text style={styles.legendLabel}>
                              Abstain — {pollResults.abstainCount} (
                              {pollResults.abstainPercentage.toFixed(1)}%)
                            </Text>
                          </View>
                        )}
                        <Text style={styles.resultsTotal}>
                          Total selections: {pollResults.totalSelections}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>
                      No votes recorded for this poll yet.
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.center, { paddingVertical: 12 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ maxHeight: detailsMaxHeight - 28 }}
          >
            <Text style={styles.emptyText}>
              Select a poll above to view and vote.
            </Text>
          </ScrollView>
        )}
      </View>
    </BackgroundScreen>
  );
};

export default PollsScreen;

const styles = StyleSheet.create({
  root: {
    marginTop: 30,
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  headerMeta: {
    fontSize: 12,
    color: '#ed9633ff',
  },
  errorText: {
    color: 'rgba(247, 61, 61, 1)',
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
  pollListCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  pollCard: {
    width: 220,
    borderRadius: 14,
    backgroundColor: '#f9d6a1ff',
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
  detailsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  detailsClosedLabel: {
    fontSize: 12,
    color: '#d00',
    marginBottom: 6,
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
  resultsSection: {
    marginTop: 12,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsBarContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultsBarSegment: {
    height: '100%',
  },
  resultsLegend: {
    flex: 1,
    marginLeft: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#333',
    flexShrink: 1,
  },
  resultsTotal: {
    marginTop: 6,
    fontSize: 12,
    color: '#555',
  },
});
