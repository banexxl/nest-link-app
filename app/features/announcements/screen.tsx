// app/main/announcements.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getBuildingIdFromUserId } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import RenderHTML from 'react-native-render-html';

const PRIMARY_COLOR = '#f68a00';

type StorageRef = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  category: string | null;
  subcategory: string | null;
  pinned: boolean;
  archived: boolean;
  status: string;
  created_at: string;
  images?: StorageRef[]; // tblAnnouncementImages
  docs?: StorageRef[];   // tblAnnouncementDocs
};

const AnnouncementsScreen: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const { width } = useWindowDimensions();
  const { handleScroll } = useTabBarScroll();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const [buildingId, setBuildingId] = useState<string | null>(null);

  // cache of signed URLs: key = `${bucket}:${path}`
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Resolve current tenant's building_id from the authenticated user
  useEffect(() => {
    const loadBuilding = async () => {
      if (!userId) {
        setError('You must be signed in to view announcements.');
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

  const fetchAnnouncements = useCallback(async () => {
    if (!buildingId) return;

    setError(null);
    setLoading(true);
    try {
      // 1) Find announcement_ids linked to this building via the junction table
      const { data: linkRows, error: linkError } = await supabase
        .from('tblBuildings_Announcements')
        .select('announcement_id')
        .eq('building_id', buildingId);

      if (linkError) {
        setError(linkError.message);
        setAnnouncements([]);
        return;
      }

      const ids = (linkRows ?? [])
        .map((row: any) => row.announcement_id as string | null)
        .filter((id): id is string => !!id);

      if (!ids.length) {
        setAnnouncements([]);
        setVisibleCount(10);
        return;
      }

      // 2) Load only those announcements
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
        setError(error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements((data ?? []) as Announcement[]);
        setVisibleCount(10);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load announcements.');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (buildingId) {
      fetchAnnouncements();
    }
  }, [buildingId, fetchAnnouncements]);

  // After announcements load/change, pre-sign all unique storage refs
  useEffect(() => {
    const signAll = async () => {
      const toSign: { key: string; bucket: string; path: string }[] = [];

      announcements.forEach((a) => {
        const allRefs = [...(a.images ?? []), ...(a.docs ?? [])];
        allRefs.forEach((ref) => {
          if (!ref.storage_bucket || !ref.storage_path) return;
          const key = `${ref.storage_bucket}:${ref.storage_path}`;
          if (signedUrls[key]) return;
          if (toSign.find((t) => t.key === key)) return;
          toSign.push({
            key,
            bucket: ref.storage_bucket,
            path: ref.storage_path,
          });
        });
      });

      if (!toSign.length) return;

      const newMap: Record<string, string> = {};

      for (const item of toSign) {
        const url = await signFileUrl({
          bucket: item.bucket,
          path: item.path,
        }, true);
        if (url) {
          newMap[item.key] = url;
        }
      }

      if (Object.keys(newMap).length) {
        setSignedUrls((prev) => ({ ...prev, ...newMap }));
      }
    };


    if (announcements.length > 0) {
      signAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const openImage = async (ref: StorageRef) => {
    if (!ref.storage_bucket || !ref.storage_path) {
      console.warn('Announcement image missing storage info', ref);
      return;
    }

    const key = `${ref.storage_bucket}:${ref.storage_path}`;
    console.log('openAnnouncementImage called', {
      key,
      hasCachedUrl: !!signedUrls[key],
      bucket: ref.storage_bucket,
      path: ref.storage_path,
    });

    let url: string | null = signedUrls[key] ?? null;

    // Fallback: if we somehow don't have a cached URL (or it became invalid),
    // sign again just for this image.
    if (!url) {
      console.log('Signing announcement image on tap', {
        bucket: ref.storage_bucket,
        path: ref.storage_path,
      });
      url = await signFileUrl({
        bucket: ref.storage_bucket,
        path: ref.storage_path,
        ttlSeconds: 60 * 20,
      });

      if (!url) {
        console.error('Failed to sign announcement image URL', { key });
        return;
      }

      const nonNullUrl: string = url;
      setSignedUrls((prev) => ({ ...prev, [key]: nonNullUrl }));
    }

    console.log('Setting selectedImageUrl for announcement', { url });
    setSelectedImageUrl(url);
  };

  const openDoc = async (ref: StorageRef) => {
    const key = `${ref.storage_bucket}:${ref.storage_path}`;

    let url: string | null = signedUrls[key] ?? null;

    if (!url) {
      url = await signFileUrl({
        bucket: ref.storage_bucket,
        path: ref.storage_path,
      });

      if (!url) return; // stop if signing failed
      const nonNullUrl: string = url;
      setSignedUrls((prev) => ({ ...prev, [key]: nonNullUrl }));
    }

    Linking.openURL(url).catch((err) =>
      console.log('Failed to open document:', err)
    );
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.category || 'General'}
              {item.subcategory ? ` · ${item.subcategory}` : ''}
            </Text>
          </View>
          {item.pinned ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>Pinned</Text>
            </View>
          ) : null}
        </View>

        {date ? <Text style={styles.dateText}>{date}</Text> : null}

        <RenderHTML
          contentWidth={width}
          source={{ html: item.message ?? '' }}
          baseStyle={styles.messageText}
          tagsStyles={{
            p: { marginBottom: 6 },
          }}
        />

        {/* Images scroller */}
        {item.images && item.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroller}
          >
            {item.images.map((img) => {
              const key = `${img.storage_bucket}:${img.storage_path}`;
              const url = signedUrls[key];

              return (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => openImage(img)}
                  activeOpacity={0.85}
                >
                  <View style={styles.imageWrapper}>
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
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Documents */}
        {item.docs && item.docs.length > 0 && (
          <View style={styles.docsContainer}>
            {item.docs.map((doc, index) => (
              <TouchableOpacity
                key={doc.id}
                onPress={() => openDoc(doc)}
                style={styles.docButton}
                activeOpacity={0.8}
              >
                <Text style={styles.docButtonText}>
                  {`Document ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && announcements.length === 0) {
    return <Loader />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnnouncements}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <BackgroundScreen>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerMeta}>
          {announcements.length} total
        </Text>
      </View>

      <FlatList
        data={announcements.slice(0, visibleCount)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderAnnouncement}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          announcements.length > visibleCount ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((prev) => prev + 10)}
              activeOpacity={0.85}
            >
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No announcements yet.</Text>
          </View>
        }
      />

      {/* Fullscreen image viewer */}
      <Modal
        visible={!!selectedImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedImageUrl && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                style={styles.modalTouchArea}
                onPress={() => setSelectedImageUrl(null)}
              >
                <ExpoImage
                  source={{ uri: selectedImageUrl }}
                  style={styles.modalImage}
                  contentFit="contain"
                  onLoad={() =>
                    console.log('Announcement modal image loaded', {
                      url: selectedImageUrl,
                    })
                  }
                  onError={(e) =>
                    console.error('Announcement modal image failed to load', {
                      url: selectedImageUrl,
                      error: e,
                    })
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedImageUrl(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </BackgroundScreen>
  );
};

export default AnnouncementsScreen;

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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  card: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  cardMeta: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(246,138,0,0.1)',
    marginLeft: 8,
  },
  pillText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  imagesScroller: {
    marginTop: 4,
    marginBottom: 6,
  },
  imageWrapper: {
    marginRight: 8,
  },
  imageThumb: {
    width: 96,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  imagePlaceholder: {
    width: 96,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
  },
  docsContainer: {
    marginTop: 4,
  },
  docButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#f7f7fb',
  },
  docButtonText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  loadMoreButton: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  modalTouchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
