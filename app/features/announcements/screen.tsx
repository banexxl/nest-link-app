// app/main/announcements.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import { styles } from './styles';
import {
  Announcement,
  StorageRef,
  fetchAnnouncementsForBuilding,
  prefetchAnnouncementSignedUrls,
  resolveAnnouncementBuilding,
  signAnnouncementRef,
} from './server-actions';

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
        const { buildingId: resolvedBuildingId, error: buildingError } =
          await resolveAnnouncementBuilding(userId);

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

  const fetchAnnouncements = useCallback(async () => {
    if (!buildingId) return;

    setError(null);
    setLoading(true);
    try {
      const { announcements: fetchedAnnouncements, error: fetchError } =
        await fetchAnnouncementsForBuilding(buildingId);

      if (fetchError) {
        setError(fetchError);
        setAnnouncements([]);
      } else {
        setAnnouncements(fetchedAnnouncements);
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
      const newMap = await prefetchAnnouncementSignedUrls(announcements, signedUrls);
      if (Object.keys(newMap).length) {
        setSignedUrls((prev) => ({ ...prev, ...newMap }));
      }
    };


    if (announcements.length > 0) {
      signAll();
    }
  }, [announcements, signedUrls]);

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
      url = await signAnnouncementRef(ref, 60 * 20);

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
      url = await signAnnouncementRef(ref);

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
