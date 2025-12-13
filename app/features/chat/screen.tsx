import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  TenantPost,
  TenantPostComment,
  addCommentLike,
  addPostComment,
  addPostLike,
  createTenantPost,
  fetchTenantNamesByIds,
  fetchTenantPosts,
  prefetchPostImageUrls,
  removeCommentLike,
  removePostLike,
  resolveChatBuilding,
  resolveTenant,
  resolveTenantAndProfile
} from './server-actions';
import { styles } from './styles';


export default function ChatScreen() {
  const primary = useThemeColor({}, 'primary', 'main');
  const secondary = useThemeColor({}, 'secondary', 'dark');
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { handleScroll } = useTabBarScroll();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [posts, setPosts] = useState<TenantPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(new Set());
  const [commentingPostIds, setCommentingPostIds] = useState<Set<string>>(new Set());
  const [likingCommentIds, setLikingCommentIds] = useState<Set<string>>(new Set());
  const [visibleCommentCounts, setVisibleCommentCounts] = useState<Record<string, number>>({});

  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [likesModalItems, setLikesModalItems] = useState<string[]>([]);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const PAGE_SIZE = 10;
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // Resolve current tenant's building_id from the authenticated user
  useEffect(() => {
    const loadBuilding = async () => {
      if (!userId) {
        setError('You must be signed in to view the feed.');
        setLoading(false);
        return;
      }

      try {
        const { buildingId: resolvedBuildingId, error: buildingError } =
          await resolveChatBuilding(userId);

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
  }, [userId]);

  // Resolve current tenant_id from the authenticated user (for likes, etc.)
  useEffect(() => {
    const loadTenant = async () => {
      if (!userId) {
        setTenantId(null);
        return;
      }

      try {
        const { tenantId: resolvedTenantId } = await resolveTenant(userId);

        if (!resolvedTenantId) {
          setTenantId(null);
          return;
        }

        setTenantId(resolvedTenantId);
      } catch {
        setTenantId(null);
      }
    };

    loadTenant();
  }, [userId]);

  const fetchPosts = useCallback(
    async (reset: boolean) => {
      if (!buildingId) return;

      setError(null);
      if (reset) {
        setLoading(true);
        setHasMorePosts(true);
        setPostsOffset(0);
      } else {
        if (!hasMorePosts || loadingMorePosts) return;
        setLoadingMorePosts(true);
      }

      const from = reset ? 0 : postsOffset;
      const to = from + PAGE_SIZE - 1;

      try {
        const { posts: fetchedPosts, error: fetchError } = await fetchTenantPosts(
          buildingId,
          from,
          to
        );

        if (fetchError) {
          if (reset) {
            setError(fetchError);
            setPosts([]);
          }
        } else {
          const newPosts = fetchedPosts;
          setHasMorePosts(newPosts.length === PAGE_SIZE);

          if (reset) {
            setPosts(newPosts);
            setPostsOffset(newPosts.length);
          } else if (newPosts.length) {
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const merged = [...prev];
              newPosts.forEach((p) => {
                if (!existingIds.has(p.id)) {
                  merged.push(p);
                }
              });
              return merged;
            });
            setPostsOffset((prev) => prev + newPosts.length);
          }
        }
      } catch (err: any) {
        if (reset) {
          setError(err?.message ?? 'Failed to load posts.');
          setPosts([]);
        }
      } finally {
        if (reset) {
          setLoading(false);
          setRefreshing(false);
        } else {
          setLoadingMorePosts(false);
        }
      }
    },
    [buildingId, PAGE_SIZE, hasMorePosts, loadingMorePosts, postsOffset]
  );

  useEffect(() => {
    if (buildingId) {
      fetchPosts(true);
    }
  }, [buildingId]);

  // Pre-sign all post images (can be optimized later if needed)
  useEffect(() => {
    const signAll = async () => {
      const newMap = await prefetchPostImageUrls(posts, signedUrls);
      if (Object.keys(newMap).length) {
        setSignedUrls((prev) => ({ ...prev, ...newMap }));
      }
    };

    if (posts.length > 0) {
      signAll();
    }
  }, [posts, signedUrls]);

  // Resolve display names for all tenants who authored posts/comments
  useEffect(() => {
    const syncTenantNames = async () => {
      const ids = new Set<string>();
      posts.forEach((post) => {
        if (post.tenant_id) ids.add(post.tenant_id);
        (post.comments ?? []).forEach((c) => {
          if (c.tenant_id) ids.add(c.tenant_id);
        });
      });

      const missing = Array.from(ids).filter((id) => !tenantNames[id]);
      if (!missing.length) return;

      try {
        const { names } = await fetchTenantNamesByIds(missing);
        const map: Record<string, string> = {};
        missing.forEach((id, index) => {
          map[id] = names[index] ?? 'Unknown tenant';
        });
        setTenantNames((prev) => ({ ...prev, ...map }));
      } catch {
        // ignore name resolution failures; keep existing labels
      }
    };

    if (posts.length > 0) {
      syncTenantNames();
    }
  }, [posts, tenantNames]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts(true);
  };

  const handleCreatePost = async () => {
    const text = composerText.trim();
    if (!text) return;
    if (!userId || !buildingId) {
      Alert.alert('Post error', 'Missing user or building information.');
      return;
    }

    setPosting(true);
    try {
      const { tenantId: resolvedTenantId, profileId, error } = await resolveTenantAndProfile(userId);

      if (!resolvedTenantId || !profileId) {
        Alert.alert(
          'Post error',
          error ?? 'Could not resolve tenant profile for this user.'
        );
        return;
      }

      const payload = {
        content_text: text,
        building_id: buildingId,
        is_archived: false,
        profile_id: profileId,
        tenant_id: resolvedTenantId,
      };

      const { post, error: createError } = await createTenantPost(payload);

      if (createError || !post) {
        Alert.alert('Post error', createError ?? 'Failed to create post.');
      } else {
        setPosts((prev) => [post, ...prev]);
        setComposerText('');
      }
    } catch (err: any) {
      Alert.alert('Post error', err?.message ?? 'Failed to create post.');
    } finally {
      setPosting(false);
    }
  };

  const handleTogglePostLike = async (post: TenantPost) => {
    if (!userId) {
      Alert.alert('Like error', 'You must be signed in to like posts.');
      return;
    }

    setLikingPostIds((prev) => new Set(prev).add(post.id));
    try {
      const { tenantId: resolvedTenantId, error } = await resolveTenant(userId);

      if (!resolvedTenantId) {
        Alert.alert(
          'Like error',
          error ?? 'Could not resolve tenant for this user.'
        );
        return;
      }

      const alreadyLiked = (post.likes ?? []).find((l) => l.tenant_id === resolvedTenantId);

      if (alreadyLiked) {
        const { error: removeError } = await removePostLike(alreadyLiked.id);

        if (removeError) {
          Alert.alert('Like error', removeError ?? 'Failed to remove like.');
          return;
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                ...p,
                likes: (p.likes ?? []).filter((l) => l.id !== alreadyLiked.id),
              }
              : p
          )
        );
      } else {
        const { like, error: insertError } = await addPostLike({
          post_id: post.id,
          tenant_id: resolvedTenantId,
          emoji: 'dY`?' as string | null,
        });

        if (insertError || !like) {
          Alert.alert('Like error', insertError ?? 'Failed to like post.');
          return;
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                ...p,
                likes: [...(p.likes ?? []), like],
              }
              : p
          )
        );
      }
    } catch (err: any) {
      Alert.alert('Like error', err?.message ?? 'Failed to update like.');
    } finally {
      setLikingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  };
  const handleAddComment = async (post: TenantPost) => {
    const draft = (commentDrafts[post.id] ?? '').trim();
    if (!draft) return;
    if (!userId || !buildingId) {
      Alert.alert('Comment error', 'Missing user or building information.');
      return;
    }

    setCommentingPostIds((prev) => new Set(prev).add(post.id));
    try {
      const { tenantId: resolvedTenantId, profileId, error } = await resolveTenantAndProfile(userId);

      if (!resolvedTenantId || !profileId) {
        Alert.alert(
          'Comment error',
          error ?? 'Could not resolve tenant profile for this user.'
        );
        return;
      }

      const { comment, error: insertError } = await addPostComment({
        post_id: post.id,
        tenant_id: resolvedTenantId,
        profile_id: profileId,
        comment_text: draft,
        client_id: null as string | null,
        building_id: buildingId,
      });

      if (insertError || !comment) {
        Alert.alert('Comment error', insertError ?? 'Failed to add comment.');
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
              ...p,
              comments: [...(p.comments ?? []), comment],
            }
            : p
        )
      );

      setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
    } catch (err: any) {
      Alert.alert('Comment error', err?.message ?? 'Failed to add comment.');
    } finally {
      setCommentingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  };
  const handleToggleCommentLike = async (postId: string, comment: TenantPostComment) => {
    if (!userId || !tenantId) {
      Alert.alert('Like error', 'Missing user or tenant information.');
      return;
    }

    const alreadyLiked = (comment.likes ?? []).find((l) => l.tenant_id === tenantId);

    setLikingCommentIds((prev) => new Set(prev).add(comment.id));
    try {
      if (alreadyLiked) {
        const { error } = await removeCommentLike(alreadyLiked.id);

        if (error) {
          Alert.alert('Like error', error ?? 'Failed to remove comment like.');
          return;
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                ...p,
                comments: (p.comments ?? []).map((c) =>
                  c.id === comment.id
                    ? {
                      ...c,
                      likes: (c.likes ?? []).filter((l) => l.id !== alreadyLiked.id),
                    }
                    : c
                ),
              }
              : p
          )
        );
      } else {
        const { like, error } = await addCommentLike({
          comment_id: comment.id,
          tenant_id: tenantId,
          emoji: 'dY`?' as string | null,
        });

        if (error || !like) {
          Alert.alert('Like error', error ?? 'Failed to like comment.');
          return;
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                ...p,
                comments: (p.comments ?? []).map((c) =>
                  c.id === comment.id
                    ? {
                      ...c,
                      likes: [...(c.likes ?? []), like],
                    }
                    : c
                ),
              }
              : p
          )
        );
      }
    } catch (err: any) {
      Alert.alert('Like error', err?.message ?? 'Failed to update comment like.');
    } finally {
      setLikingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };
  const openPostLikesModal = async (post: TenantPost) => {
    const likes = post.likes ?? [];
    if (!likes.length) return;

    const tenantIds = Array.from(
      new Set(
        likes
          .map((l) => l.tenant_id)
          .filter((id): id is string => !!id)
      )
    );

    if (!tenantIds.length) {
      const fallback = likes.map((_, index) => `User ${index + 1}`);
      setLikesModalItems(fallback);
      setLikesModalVisible(true);
      return;
    }

    try {
      const { names } = await fetchTenantNamesByIds(tenantIds);
      const items = names.length ? names : tenantIds;
      setLikesModalItems(items);
      setLikesModalVisible(true);
    } catch {
      const fallback = tenantIds;
      setLikesModalItems(fallback);
      setLikesModalVisible(true);
    }
  };
  const renderPostImages = (post: TenantPost) => {
    if (!post.images || post.images.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8, marginBottom: 4 }}
      >
        {post.images.map((img) => {
          const key = `${img.storage_bucket}:${img.storage_path}`;
          const url = signedUrls[key];
          return (
            <View key={img.id} style={{ marginRight: 8 }}>
              {url ? (
                <ExpoImage
                  source={{ uri: url }}
                  style={styles.imageThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator size="small" />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderPostItem = ({ item }: { item: TenantPost }) => {
    const likeCount = item.likes?.length ?? 0;
    const commentCount = item.comments?.length ?? 0;

    const authorName = item.tenant_id ? tenantNames[item.tenant_id] : 'Unknown tenant';
    const relative = item.created_at ? formatRelativeTime(item.created_at) : '';
    const isLikedByMe = !!(tenantId && (item.likes ?? []).some((l) => l.tenant_id === tenantId));

    const likeBusy = likingPostIds.has(item.id);
    const commentBusy = commentingPostIds.has(item.id);
    const commentDraft = commentDrafts[item.id] ?? '';

    const sortedComments = (item.comments ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // LinkedIn usually shows older -> newer

    const initialVisible = visibleCommentCounts[item.id] ?? 2; // LI style: show only a couple
    const visibleCount = Math.min(initialVisible, sortedComments.length);
    const visibleComments = sortedComments.slice(Math.max(0, sortedComments.length - visibleCount));
    const hasMoreComments = sortedComments.length > visibleCount;

    return (
      <View style={styles.liCard}>
        {/* Header */}
        <View style={styles.liHeaderRow}>
          <AvatarCircle label={authorName} />

          <View style={styles.liHeaderMeta}>
            <Text style={styles.liAuthorName} numberOfLines={1}>
              {authorName}
            </Text>
            <View style={styles.liSubMetaRow}>
              <Text style={styles.liSubMetaText}>{relative}</Text>
              <Text style={styles.liDot}>·</Text>
              <Text style={styles.liSubMetaText}>Building</Text>
            </View>
          </View>

          <Pressable style={styles.liHeaderMenu} hitSlop={10} onPress={() => Alert.alert('Post', 'Menu')}>
            <Text style={styles.liMenuDots}>•••</Text>
          </Pressable>
        </View>

        {/* Body text */}
        {!!item.content_text && (
          <View style={{ marginTop: 6 }}>
            <TextWithSeeMore text={item.content_text} numberOfLines={4} />
          </View>
        )}

        {/* Media */}
        {renderPostImages(item)}

        {/* Counts row */}
        <View style={styles.liCountsRow}>
          <TouchableOpacity
            disabled={likeCount === 0}
            onPress={() => likeCount > 0 && openPostLikesModal(item)}
            activeOpacity={0.7}
          >
            <View style={styles.liLikeCountLeft}>
              {likeCount > 0 && <View style={styles.liLikeDotBadge}><Text style={styles.liLikeDotBadgeText}>👍</Text></View>}
              <Text style={styles.liCountsText}>
                {likeCount > 0 ? `${likeCount}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.liCountsTextRight}>
            {commentCount > 0 ? `${commentCount} comments` : ''}
          </Text>
        </View>

        <View style={styles.liDivider} />

        {/* Actions row */}
        <View style={styles.liActionsRow}>
          <TouchableOpacity
            style={styles.liActionBtn}
            activeOpacity={0.7}
            onPress={() => handleTogglePostLike(item)}
            disabled={likeBusy}
          >
            {likeBusy ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text style={[styles.liActionText, isLikedByMe && styles.liActionTextActive]}>
                👍 Like
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.liActionBtn}
            activeOpacity={0.7}
            onPress={() =>
              setVisibleCommentCounts((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] ?? 2, 6) }))
            }
          >
            <Text style={styles.liActionText}>💬 Comment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liDivider} />

        {/* Comments */}
        {commentCount > 0 && (
          <View style={styles.liCommentsBlock}>
            {hasMoreComments && (
              <TouchableOpacity
                onPress={() =>
                  setVisibleCommentCounts((prev) => ({
                    ...prev,
                    [item.id]: (prev[item.id] ?? 2) + 10,
                  }))
                }
                activeOpacity={0.8}
              >
                <Text style={styles.liViewAllComments}>View all comments</Text>
              </TouchableOpacity>
            )}

            {visibleComments.map((c) => {
              const cAuthor = c.tenant_id ? tenantNames[c.tenant_id] : 'Unknown';
              const cTime = c.created_at ? formatRelativeTime(c.created_at) : '';
              const cLiked = !!(tenantId && (c.likes ?? []).some((l) => l.tenant_id === tenantId));
              const cBusy = likingCommentIds.has(c.id);
              const cLikeCount = c.likes?.length ?? 0;

              return (
                <View key={c.id} style={styles.liCommentRow}>
                  <AvatarCircle label={cAuthor} />

                  <View style={styles.liCommentBubble}>
                    <View style={styles.liCommentTopRow}>
                      <Text style={styles.liCommentAuthor} numberOfLines={1}>{cAuthor}</Text>
                      <Text style={styles.liCommentTime}>{cTime}</Text>
                    </View>

                    <Text style={styles.liCommentText}>{c.comment_text ?? ''}</Text>

                    <View style={styles.liCommentActionsRow}>
                      <TouchableOpacity
                        onPress={() => handleToggleCommentLike(item.id, c)}
                        disabled={cBusy}
                        activeOpacity={0.7}
                      >
                        {cBusy ? (
                          <ActivityIndicator size="small" color="#6B7280" />
                        ) : (
                          <Text style={[styles.liMiniAction, cLiked && styles.liMiniActionActive]}>
                            Like{cLikeCount ? ` · ${cLikeCount}` : ''}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Comment composer */}
        <View style={styles.liCommentComposerRow}>
          <AvatarCircle label={tenantId ? (tenantNames[tenantId] ?? 'You') : 'You'} />

          <View style={styles.liCommentInputWrap}>
            <TextInput
              style={styles.liCommentInput}
              placeholder="Add a comment…"
              value={commentDraft}
              onChangeText={(text) => setCommentDrafts((prev) => ({ ...prev, [item.id]: text }))}
              multiline
            />
            <TouchableOpacity
              onPress={() => handleAddComment(item)}
              disabled={!commentDraft.trim() || commentBusy}
              activeOpacity={0.85}
              style={[
                styles.liSendBtn,
                (!commentDraft.trim() || commentBusy) && styles.liSendBtnDisabled,
              ]}
            >
              {commentBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.liSendBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };


  const renderComposer = () => {
    return (
      <View style={styles.composerCard}>
        <Text style={styles.composerTitle}>Share an update</Text>
        <TextInput
          style={styles.composerInput}
          placeholder="Write something for your building..."
          value={composerText}
          onChangeText={setComposerText}
          multiline
        />
        <TouchableOpacity
          style={[styles.composerButton, (!composerText.trim() || posting) && styles.composerButtonDisabled]}
          onPress={handleCreatePost}
          disabled={!composerText.trim() || posting}
          activeOpacity={0.85}
        >
          {posting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.composerButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <BackgroundScreen>
        <Loader />
      </BackgroundScreen>
    );
  }

  if (error) {
    return (
      <BackgroundScreen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </BackgroundScreen>
    );
  }

  const formatRelativeTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const day = Math.floor(h / 24);

    if (s < 60) return `${s}s`;
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    if (day < 7) return `${day}d`;
    return d.toLocaleDateString();
  };

  const AvatarCircle = ({ label }: { label: string }) => {
    const initials =
      (label || 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || 'U';

    return (
      <View style={styles.liAvatar}>
        <Text style={styles.liAvatarText}>{initials}</Text>
      </View>
    );
  };

  const TextWithSeeMore = ({
    text,
    numberOfLines = 4,
  }: {
    text: string;
    numberOfLines?: number;
  }) => {
    const [expanded, setExpanded] = useState(false);
    const [showMore, setShowMore] = useState(false);

    return (
      <View>
        <Text
          style={styles.liPostText}
          numberOfLines={expanded ? undefined : numberOfLines}
          onTextLayout={(e) => {
            // crude but practical: if it overflows the given lines, show "…see more"
            if (!expanded && e.nativeEvent.lines?.length > numberOfLines) setShowMore(true);
          }}
        >
          {text}
        </Text>

        {showMore && !expanded && (
          <Text style={styles.liSeeMore} onPress={() => setExpanded(true)}>
            …see more
          </Text>
        )}
      </View>
    );
  };

  return (
    <BackgroundScreen>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageHeaderTitle}>Building feed</Text>
        <Text style={[styles.pageHeaderMeta, { color: secondary }]}>{posts.length} posts</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderComposer()}
        renderItem={renderPostItem}
        ListFooterComponent={
          hasMorePosts ? (
            <View style={styles.loadMorePostsContainer}>
              <TouchableOpacity
                style={styles.loadMorePostsButton}
                onPress={() => fetchPosts(false)}
                disabled={loadingMorePosts}
                activeOpacity={0.85}
              >
                {loadingMorePosts ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loadMorePostsText}>Load more posts</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
            colors={[primary]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet. Be the first to share something!</Text>
          </View>
        )}
      />

      {likesModalVisible && (
        <View style={styles.likesModalOverlay}>
          <View style={styles.likesModalCard}>
            <Text style={styles.likesModalTitle}>Post likes</Text>
            <ScrollView style={styles.likesModalList}>
              {likesModalItems.map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.likesModalItem}>
                  {label}
                </Text>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.likesModalCloseButton}
              onPress={() => setLikesModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.likesModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </BackgroundScreen>
  );
}

