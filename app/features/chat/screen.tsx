import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

type TenantPostImage = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

type TenantPostLike = {
  id: string;
  post_id: string;
  tenant_id: string | null;
  created_at: string;
  emoji: string | null;
};

type TenantPostCommentLike = {
  id: string;
  comment_id: string;
  tenant_id: string | null;
  created_at: string;
  emoji: string | null;
  building_id: string | null;
};

type TenantPostComment = {
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

type TenantPost = {
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

export default function ChatScreen() {
  const primary = useThemeColor({}, 'primary', 'main');
  const secondary = useThemeColor({}, 'secondary', 'dark');
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { handleScroll } = useTabBarScroll();

  const [buildingId, setBuildingId] = useState<string | null>(null);
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

  // Resolve current tenant's building_id from the authenticated user
  useEffect(() => {
    const loadBuilding = async () => {
      if (!userId) {
        setError('You must be signed in to view the feed.');
        setLoading(false);
        return;
      }

      try {
        const result = await getBuildingIdFromUserId(supabase, userId);
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
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!buildingId) return;

    setError(null);
    setLoading(true);
    try {
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
              emoji,
              building_id
            )
          )
        `
        )
        .eq('building_id', buildingId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        setPosts([]);
      } else {
        setPosts((data ?? []) as TenantPost[]);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load posts.');
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (buildingId) {
      fetchPosts();
    }
  }, [buildingId, fetchPosts]);

  // Pre-sign all post images (can be optimized later if needed)
  useEffect(() => {
    const signAll = async () => {
      const toSign: { key: string; bucket: string; path: string }[] = [];

      posts.forEach((post) => {
        (post.images ?? []).forEach((img) => {
          if (!img.storage_bucket || !img.storage_path) return;
          const key = `${img.storage_bucket}:${img.storage_path}`;
          if (signedUrls[key]) return;
          if (toSign.find((t) => t.key === key)) return;
          toSign.push({
            key,
            bucket: img.storage_bucket,
            path: img.storage_path,
          });
        });
      });

      if (!toSign.length) return;

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
    await fetchPosts();
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
      const payload = {
        content_text: text,
        building_id: buildingId,
        is_archived: false,
        profile_id: userId,
        tenant_id: null as string | null,
      };

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
              emoji,
              building_id
            )
          )
        `
        )
        .single();

      if (error) {
        Alert.alert('Post error', error.message ?? 'Failed to create post.');
      } else if (data) {
        setPosts((prev) => [data as TenantPost, ...prev]);
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

    const alreadyLiked = (post.likes ?? []).find((l) => l.tenant_id === userId);

    setLikingPostIds((prev) => new Set(prev).add(post.id));
    try {
      if (alreadyLiked) {
        const { error } = await supabase
          .from('tblTenantPostLikes')
          .delete()
          .eq('id', alreadyLiked.id);

        if (error) {
          Alert.alert('Like error', error.message ?? 'Failed to remove like.');
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
        const payload = {
          post_id: post.id,
          tenant_id: userId,
          emoji: '👍' as string | null,
        };

        const { data, error } = await supabase
          .from('tblTenantPostLikes')
          .insert(payload)
          .select('id, post_id, tenant_id, created_at, emoji')
          .single();

        if (error) {
          Alert.alert('Like error', error.message ?? 'Failed to like post.');
          return;
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                ...p,
                likes: [...(p.likes ?? []), (data as TenantPostLike)],
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
      const payload = {
        post_id: post.id,
        tenant_id: userId,
        profile_id: userId,
        comment_text: draft,
        client_id: null as string | null,
        building_id: buildingId,
      };

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
            emoji,
            building_id
          )
        `
        )
        .single();

      if (error) {
        Alert.alert('Comment error', error.message ?? 'Failed to add comment.');
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
              ...p,
              comments: [...(p.comments ?? []), (data as TenantPostComment)],
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
    if (!userId || !buildingId) {
      Alert.alert('Like error', 'Missing user or building information.');
      return;
    }

    const alreadyLiked = (comment.likes ?? []).find((l) => l.tenant_id === userId);

    setLikingCommentIds((prev) => new Set(prev).add(comment.id));
    try {
      if (alreadyLiked) {
        const { error } = await supabase
          .from('tblTenantPostCommentLikes')
          .delete()
          .eq('id', alreadyLiked.id);

        if (error) {
          Alert.alert('Like error', error.message ?? 'Failed to remove comment like.');
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
        const payload = {
          comment_id: comment.id,
          tenant_id: userId,
          emoji: '👍' as string | null,
          building_id: buildingId,
        };

        const { data, error } = await supabase
          .from('tblTenantPostCommentLikes')
          .insert(payload)
          .select('id, comment_id, tenant_id, created_at, emoji, building_id')
          .single();

        if (error) {
          Alert.alert('Like error', error.message ?? 'Failed to like comment.');
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
                      likes: [...(c.likes ?? []), (data as TenantPostCommentLike)],
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

  const openPostLikesModal = (post: TenantPost) => {
    const likes = post.likes ?? [];
    if (!likes.length) return;

    const items = likes.map((l, index) => l.tenant_id ?? `User ${index + 1}`);
    setLikesModalItems(items);
    setLikesModalVisible(true);
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

    const isLikedByMe = !!(item.likes ?? []).find((l) => l.tenant_id === userId);
    const likeBusy = likingPostIds.has(item.id);
    const commentBusy = commentingPostIds.has(item.id);
    const commentDraft = commentDrafts[item.id] ?? '';

    return (
      <View style={styles.postCard}>
        <Text style={styles.postMeta}>{createdLabel}</Text>
        {item.content_text ? (
          <Text style={styles.postText}>{item.content_text}</Text>
        ) : null}

        {renderPostImages(item)}

        {/* Existing comments (simple list for now) */}
        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsContainer}>
            {item.comments
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
              .map((c) => (
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
          </View>
        )}

        <View style={styles.postFooterRow}>
          <Text style={styles.postCounts}>
            {likeCount} likes · {commentCount} comments
          </Text>
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
                  {isLikedByMe ? 'Liked' : 'Like'}
                </Text>
              )}
            </TouchableOpacity>
            {likeCount > 0 && (
              <TouchableOpacity
                style={styles.postActionButton}
                activeOpacity={0.7}
                onPress={() => openPostLikesModal(item)}
              >
                <Text style={styles.postActionTextSecondary}>View</Text>
              </TouchableOpacity>
            )}
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
        ListHeaderComponent={renderComposer}
        renderItem={renderPostItem}
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pageHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  pageHeaderMeta: {
    fontSize: 12,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  composerCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  composerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  composerInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  composerButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  composerButtonDisabled: {
    opacity: 0.7,
  },
  composerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  postMeta: {
    fontSize: 11,
    color: '#777',
    marginBottom: 4,
  },
  postText: {
    fontSize: 14,
    color: '#222',
  },
  imageThumb: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  imagePlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postFooterRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postCounts: {
    fontSize: 12,
    color: '#777',
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postActionButton: {
    marginLeft: 12,
  },
  postActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  postActionTextActive: {
    color: '#d9534f',
  },
  postActionTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  commentsContainer: {
    marginTop: 8,
  },
  commentRow: {
    marginTop: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#222',
  },
  commentMeta: {
    fontSize: 11,
    color: '#888',
  },
  commentFooterRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentLikeButton: {
    marginLeft: 12,
  },
  commentLikeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  commentLikeTextActive: {
    color: '#d9534f',
  },
  commentComposerRow: {
    marginTop: 8,
  },
  commentInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  commentSendButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  commentSendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  likesModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesModalCard: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  likesModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  likesModalList: {
    maxHeight: 260,
    marginBottom: 10,
  },
  likesModalItem: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
  },
  likesModalCloseButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  likesModalCloseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
