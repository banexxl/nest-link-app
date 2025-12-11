// app/main/polls.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { PRIMARY_COLOR, styles } from './styles';
import {
  Poll,
  PollAttachment,
  PollVote,
  fetchExistingPollVote,
  fetchPollVotes,
  fetchPollsForBuilding,
  resolvePollBuilding,
  signPollAttachment,
  submitPollVote,
} from './server-actions';

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
        const { polls: fetchedPolls, error: fetchError } =
          await fetchPollsForBuilding(buildingId);

        if (fetchError) {
          setError(fetchError);
          setPolls([]);
        } else {
          setPolls(fetchedPolls);
          if (!selectedPollId && fetchedPolls.length > 0) {
            setSelectedPollId(fetchedPolls[0].id);
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
        const { buildingId: resolvedBuildingId, error: buildingError } =
          await resolvePollBuilding(authUserId);

        if (!resolvedBuildingId) {
          setError(buildingError ?? 'Unable to determine building for this tenant.');
          setBuildingId(null);
          setLoading(false);
          return;
        }

        setBuildingId(resolvedBuildingId);
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
        const { vote, error } = await fetchExistingPollVote(selectedPoll.id, tenantPk);

        if (error) {
          console.log('Error loading existing vote:', error);
        }

        if (vote) {
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

        const { votes, error } = await fetchPollVotes(selectedPoll.id);

        if (error) {
          console.log('Error loading poll results:', error);
          setPollResults(null);
          return;
        }

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
    const url = await signPollAttachment(att);
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

      const { error } = await submitPollVote(payload, existingVote?.id ?? null);

      if (error) {
        setVoteMessage(error ?? 'Failed to submit vote.');
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
