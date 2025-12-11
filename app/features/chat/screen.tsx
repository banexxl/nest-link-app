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
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
import { PRIMARY_COLOR, styles } from './styles';

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

  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [likesModalItems, setLikesModalItems] = useState<string[]>([]);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
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
  }, [buildingId, fetchPosts]);

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
    const createdLabel = new Date(item.created_at).toLocaleString();
    const isLikedByMe = !!(
      tenantId && (item.likes ?? []).some((l) => l.tenant_id === tenantId)
    );
    const othersCount = isLikedByMe ? Math.max(likeCount - 1, 0) : likeCount;
    const likeBusy = likingPostIds.has(item.id);
    const commentBusy = commentingPostIds.has(item.id);
    const commentDraft = commentDrafts[item.id] ?? '';

    const sortedComments = (item.comments ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    const visibleCount = Math.min(10, sortedComments.length);
    const visibleComments = sortedComments.slice(0, visibleCount);
    const hasMoreComments = sortedComments.length > visibleCount;

    return (
      <View style={styles.postCard}>
        <Text style={styles.postMeta}>{createdLabel}</Text>
        {item.content_text ? (
          <Text style={styles.postText}>{item.content_text}</Text>
        ) : null}

        {renderPostImages(item)}

        {/* Existing comments (separated and paginated) */}
        {visibleComments.length > 0 && (
          <View style={styles.commentsContainer}>
            <Text style={styles.commentsHeader}>Comments</Text>
            {visibleComments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentText}>{c.comment_text ?? ''}</Text>
                <View style={styles.commentFooterRow}>
                  <Text style={styles.commentMeta}>
                    {new Date(c.created_at).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.commentLikeButton}
                    activeOpacity={0.7}
                    onPress={() => handleToggleCommentLike(item.id, c)}
                    disabled={likingCommentIds.has(c.id)}
                  >
                    {likingCommentIds.has(c.id) ? (
                      <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                    ) : (
                      <Text
                        style={[
                          styles.commentLikeText,
                          (c.likes ?? []).some((l) => l.tenant_id === userId) &&
                          styles.commentLikeTextActive,
                        ]}
                      >
                        {(() => {
                          const count = c.likes?.length ?? 0;
                          return count > 0 ? `Like (${count})` : 'Like';
                        })()}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {hasMoreComments && (
              <TouchableOpacity
                style={styles.loadMoreCommentsButton}
                onPress={() => { /* In a real app, you could wire this to fetch older comments from the server. */ }}
                activeOpacity={0.8}
              >
                <Text style={styles.loadMoreCommentsText}>Load older comments</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.postFooterRow}>
          <TouchableOpacity
            disabled={likeCount === 0}
            onPress={() => likeCount > 0 && openPostLikesModal(item)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.postCounts,
                likeCount > 0 && styles.postCountsInteractive,
              ]}
            >
              {(() => {
                if (likeCount === 0) {
                  return `${commentCount} comments`;
                }

                if (isLikedByMe) {
                  if (othersCount === 0) {
                    return `You · ${commentCount} comments`;
                  }
                  return `You and ${othersCount} other${othersCount > 1 ? 's' : ''
                    } · ${commentCount} comments`;
                }

                return `${likeCount} like${likeCount > 1 ? 's' : ''
                  } · ${commentCount} comments`;
              })()}
            </Text>
          </TouchableOpacity>
          <View style={styles.postActionsRow}>
            <TouchableOpacity
              style={styles.postActionButton}
              activeOpacity={0.7}
              onPress={() => handleTogglePostLike(item)}
              disabled={likeBusy}
            >
              {likeBusy ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              ) : (
                <Text
                  style={[
                    styles.postActionText,
                    isLikedByMe && styles.postActionTextActive,
                  ]}
                >
                  {isLikedByMe ? '👍' : '👍 Like'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Inline comment composer */}
        <View style={styles.commentComposerRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={commentDraft}
            onChangeText={(text) =>
              setCommentDrafts((prev) => ({ ...prev, [item.id]: text }))
            }
            multiline
          />
          <TouchableOpacity
            style={styles.commentSendButton}
            onPress={() => handleAddComment(item)}
            disabled={!commentDraft.trim() || commentBusy}
            activeOpacity={0.85}
          >
            {commentBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.commentSendText}>Send</Text>
            )}
          </TouchableOpacity>
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

