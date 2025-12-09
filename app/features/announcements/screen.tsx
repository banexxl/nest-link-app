// app/main/announcements.tsx
import Loader from '@/components/loader';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  const { width } = useWindowDimensions();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // cache of signed URLs: key = `${bucket}:${path}`
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
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
        .eq('archived', false)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error fetching announcements:', error);
        setError(error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements((data ?? []) as Announcement[]);
      }
    } catch (err: any) {
      console.log('Unexpected error fetching announcements:', err);
      setError(err?.message ?? 'Failed to load announcements.');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

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
                  onPress={() => {
                    if (url) {
                      setSelectedImageUrl(url);
                    }
                  }}
                  activeOpacity={url ? 0.85 : 1}
                >
                  <View style={styles.imageWrapper}>
                    {url ? (
                      <Image
                        source={{ uri: url }}
                        style={styles.imageThumb}
                        resizeMode="cover"
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
    <View style={styles.root}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderAnnouncement}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedImageUrl(null)}
          >
            {selectedImageUrl && (
              <Image
                source={{ uri: selectedImageUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default AnnouncementsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f4f7',
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
});
