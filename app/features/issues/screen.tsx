// app/main/service-requests.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { uploadIncidentImage } from '@/lib/supabase-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import {
  Incident,
  IncidentCategory,
  IncidentComment,
  IncidentImage,
  IncidentPriority,
  IncidentStatus,
  NewIncidentForm,
  createIncidentComment,
  createIncidentRecord,
  fetchCommentAuthors,
  fetchIncidents as fetchIncidentsForBuilding,
  prefetchIncidentImageUrls,
  resolveClientForUser,
  resolveIssuesBuilding,
  signIncidentImage,
} from './server-actions';
import { PRIMARY_COLOR, styles } from './styles';

const incidentCategories: { label: string; value: IncidentCategory }[] = [
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Noise', value: 'noise' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Common Area', value: 'common_area' },
  { label: 'Heating', value: 'heating' },
  { label: 'Cooling', value: 'cooling' },
  { label: 'Structural', value: 'structural' },
  { label: 'Interior', value: 'interior' },
  { label: 'Outdoor Safety', value: 'outdoorsafety' },
  { label: 'Security', value: 'security' },
  { label: 'Pests', value: 'pests' },
  { label: 'Administrative', value: 'administrative' },
  { label: 'Parking', value: 'parking' },
  { label: 'IT', value: 'it' },
  { label: 'Waste', value: 'waste' },
];

const defaultForm: NewIncidentForm = {
  title: '',
  description: '',
  category: 'electrical',
  priority: 'medium',
  is_emergency: false,
};

const ServiceRequestsScreen: React.FC = () => {
  const { session } = useAuth();
  const profileId = session?.user.id ?? null; // TODO: map to tenant profile id if needed
  const { handleScroll } = useTabBarScroll();
  const { height: screenHeight } = useWindowDimensions();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const searchParams = useLocalSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );
  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );
  const detailsMaxHeight = useMemo(() => Math.max(screenHeight * 0.6, 360), [screenHeight]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewIncidentForm>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // signedUrls cache for images
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [buildingId, setBuildingId] = useState<string | null>(null);

  useEffect(() => {
    const rawParam =
      (route.params as any)?.initialPhotoUri ??
      (route.params as any)?.params?.initialPhotoUri ??
      (searchParams as any)?.initialPhotoUri;
    if (rawParam) {
      const incomingUri = String(rawParam);
      setCreating(true);
      setSelectedIncidentId(null);
      setForm(defaultForm);
      setCapturedPhotoUri(incomingUri);
      navigation.setParams({ initialPhotoUri: undefined });
    }
  }, [route.params, searchParams, navigation]);

  const fetchIncidents = useCallback(
    async (showLoading = true) => {
      if (!profileId || !buildingId) {
        if (showLoading) setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);
      try {
        const { incidents: result, error } = await fetchIncidentsForBuilding(profileId, buildingId);

        if (error) {
          setError(error);
          setIncidents([]);
        } else {
          setIncidents(result);
          if (!selectedIncidentId && result.length > 0) {
            setSelectedIncidentId(result[0].id);
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load service requests.');
        setIncidents([]);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [profileId, selectedIncidentId, buildingId]
  );
  useEffect(() => {
    if (!profileId) return;
    // Wait until buildingId is known before fetching
    if (!buildingId) return;
    fetchIncidents(true);
  }, [profileId, buildingId, fetchIncidents]);

  // Resolve tenant's building for filtering incidents
  useEffect(() => {
    const loadBuilding = async () => {
      if (!profileId) {
        setError('You must be signed in to view service requests.');
        setLoading(false);
        return;
      }

      try {
        const { buildingId: resolvedBuildingId, error: buildingError } =
          await resolveIssuesBuilding(profileId);

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
  }, [profileId]);
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents(false);
  };

  // Sign image URLs only for the currently selected incident
  useEffect(() => {
    const signSelectedIncidentImages = async () => {
      if (!selectedIncident || !selectedIncident.images?.length) return;

      const newMap = await prefetchIncidentImageUrls(selectedIncident.images, signedUrls);
      if (Object.keys(newMap).length) {
        setSignedUrls((prev) => ({ ...prev, ...newMap }));
      }
    };

    signSelectedIncidentImages();
  }, [selectedIncident, signedUrls]);
  // Resolve commenter display names from tblTenants.user_id
  useEffect(() => {
    const loadCommentAuthors = async () => {
      const idsToResolve = new Set<string>();

      incidents.forEach((inc) => {
        (inc.comments ?? []).forEach((c) => {
          if (!c.user_id) return;
          if (commentAuthors[c.user_id]) return;
          idsToResolve.add(c.user_id);
        });
      });

      if (idsToResolve.size === 0) return;

      try {
        const { authors } = await fetchCommentAuthors(Array.from(idsToResolve));

        if (Object.keys(authors).length === 0) return;

        setCommentAuthors((prev) => ({ ...prev, ...authors }));
      } catch (err: any) {
      }
    };

    if (incidents.length > 0) {
      loadCommentAuthors();
    }
  }, [incidents, commentAuthors]);
  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setCreating(false);
    setFormError(null);
    setCapturedPhotoUri(null);
  };

  const handleStartNewRequest = () => {
    setCreating(true);
    setSelectedIncidentId(null);
    setForm(defaultForm);
    setFormError(null);
    setCapturedPhotoUri(null);
  };

  const handleChangeForm = <K extends keyof NewIncidentForm>(
    key: K,
    value: NewIncidentForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      setFormError('Please enter a title.');
      return false;
    }
    if (!form.description.trim()) {
      setFormError('Please describe the issue.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmitNewIncident = async () => {
    if (!profileId) return;
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await resolveClientForUser(profileId);

      if (!result.success || !result.data) {
        setFormError(result.error ?? 'Could not resolve client/building for this tenant.');
        setSubmitting(false);
        return;
      }

      const { clientId, buildingId, apartmentId } = result.data;

      const { incident, error } = await createIncidentRecord({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category || 'electrical',
        priority: form.priority || 'medium',
        is_emergency: form.is_emergency,
        status: 'open' as IncidentStatus,
        reported_by: profileId,
        client_id: clientId,
        building_id: buildingId,
        apartment_id: apartmentId,
      });

      if (error || !incident) {
        setFormError(error ?? 'Failed to create service request.');
      } else {
        let newIncident = incident;

        if (capturedPhotoUri) {
          try {
            const uploadedImage = await uploadIncidentImage({
              clientId,
              incidentId: newIncident.id,
              localUri: capturedPhotoUri,
              buildingId,
              apartmentId,
            });

            if (uploadedImage) {
              newIncident = {
                ...newIncident,
                images: [...(newIncident.images ?? []), uploadedImage],
              };
            } else {
              Alert.alert(
                'Image upload',
                'Your request was created, but the photo could not be uploaded. You can try adding it again from the request details.'
              );
            }
          } catch (uploadErr) {
            console.warn('Failed to upload incident image', uploadErr);
            Alert.alert(
              'Image upload',
              'Your request was created, but the photo could not be uploaded. You can try adding it again from the request details.'
            );
          }
        }
        setIncidents((prev) => [newIncident, ...prev]);
        setCreating(false);
        setSelectedIncidentId(newIncident.id);
        setForm(defaultForm);
        setCapturedPhotoUri(null);
      }
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to create service request.');
    } finally {
      setSubmitting(false);
    }
  };  const handleSubmitComment = async () => {
    if (!selectedIncident || !profileId) return;
    const msg = commentText.trim();
    if (!msg) return;

    setCommentSubmitting(true);
    try {
      const { comment, error } = await createIncidentComment({
        incident_id: selectedIncident.id,
        user_id: profileId,
        message: msg,
      });

      if (error) {
        console.log('Error adding comment:', error);
      } else if (comment) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === selectedIncident.id
              ? {
                  ...inc,
                  comments: [...(inc.comments ?? []), comment],
                }
              : inc
          )
        );
        setCommentText('');
      }
    } catch (err) {
      console.log('Unexpected error adding comment:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };  const renderIncidentItem = ({ item }: { item: Incident }) => {
    const isSelected = item.id === selectedIncidentId;
    const created = new Date(item.created_at).toLocaleDateString();
    const statusLabel = item.status.toString().replace(/_/g, ' ');

    return (
      <TouchableOpacity
        style={[
          styles.incidentCard,
          isSelected && styles.incidentCardSelected,
        ]}
        onPress={() => handleSelectIncident(item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.incidentCardHeaderRow}>
          <Text style={styles.incidentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.is_emergency && (
            <View style={styles.emergencyPill}>
              <Text style={styles.emergencyPillText}>Emergency</Text>
            </View>
          )}
        </View>
        <Text style={styles.incidentMeta}>
          {created} · {statusLabel}
        </Text>
        <Text style={styles.incidentMeta}>
          {item.category} · {item.priority}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleAddImageToIncident = useCallback(async () => {
    if (!selectedIncident) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Camera permission needed', 'Enable camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      const clientId = selectedIncident.client_id;
      if (!clientId) {
        console.warn('handleAddImageToIncident: missing client_id on incident');
        return;
      }

      const uploadedImage = await uploadIncidentImage({
        clientId,
        incidentId: selectedIncident.id,
        localUri: uri,
        buildingId: selectedIncident.building_id,
        apartmentId: selectedIncident.apartment_id,
      });

      if (uploadedImage) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === selectedIncident.id
              ? {
                ...inc,
                images: [...(inc.images ?? []), uploadedImage],
              }
              : inc
          )
        );
      } else {
        Alert.alert('Image error', 'Could not upload image. Please try again.');
      }
    } catch (error) {
      console.warn('handleAddImageToIncident failed', error);
      Alert.alert('Image error', 'Could not add image. Please try again.');
    }
  }, [selectedIncident, setIncidents]);

  const openIncidentImage = async (img: IncidentImage) => {
    if (!img.storage_bucket || !img.storage_path) {
      console.warn('Incident image missing storage info', img);
      return;
    }

    const key = `${img.storage_bucket}:${img.storage_path}`;

    let url: any = signedUrls[key] ?? null;

    if (!url) {
      url = await signIncidentImage(img);

      if (!url) {
        console.error('openIncidentImage failed to sign URL', { key });
        return;
      }

      setSignedUrls((prev) => ({ ...prev, [key]: url! }));
    }

    setSelectedImageUrl(url);
  };  const renderIncidentImages = (incident: Incident) => {
    if (!incident.images || incident.images.length === 0) {
      return null;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8, marginBottom: 6 }}
      >
        {incident.images.map((img) => {
          const key = `${img.storage_bucket}:${img.storage_path}`;
          const url = signedUrls[key];
          return (
            <TouchableOpacity
              key={img.id}
              style={{ marginRight: 8 }}
              onPress={() => openIncidentImage(img)}
              activeOpacity={0.85}
            >
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  if (loading && incidents.length === 0) {
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
        <Text style={styles.pageHeaderTitle}>Service requests</Text>
        <Text style={styles.pageHeaderMeta}>{incidents.length} total</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header + list card */}
        <View style={styles.listCard}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Service requests</Text>
            <TouchableOpacity
              style={styles.newButton}
              onPress={handleStartNewRequest}
              activeOpacity={0.85}
            >
              <Text style={styles.newButtonText}>New request</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {incidents.length > 0 ? (
              <FlatList
                data={incidents}
                keyExtractor={(item) => item.id}
                renderItem={renderIncidentItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 12 }}
              />
            ) : (
              <Text style={styles.emptyText}>
                You have not submitted any service requests yet.
              </Text>
            )}
          </View>
        </View>

        {/* Details / new request card */}
        <View style={[styles.detailsCard, { maxHeight: detailsMaxHeight }]}>
          {creating ? (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchIncidents(false)} />
              }
              style={{ maxHeight: detailsMaxHeight - 28 }}
            >
              <Text style={styles.detailsTitle}>New service request</Text>

              {capturedPhotoUri ? (
                <View style={styles.capturedPhotoWrapper}>
                  <Text style={styles.photoLabel}>Attached photo from camera</Text>
                  <ExpoImage
                    source={{ uri: capturedPhotoUri }}
                    style={styles.capturedPhoto}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setCapturedPhotoUri(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.removePhotoText}>Remove photo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Short title (e.g. Water leak in bathroom)"
                value={form.title}
                onChangeText={(val) => handleChangeForm('title', val)}
              />

              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the problem in detail"
                value={form.description}
                onChangeText={(val) => handleChangeForm('description', val)}
                multiline
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {incidentCategories.map(
                  (cat) => {
                    const isSelected = form.category === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() =>
                          handleChangeForm('category', cat.value as IncidentCategory)
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.chipRow}>
                {['low', 'medium', 'high', 'urgent'].map((p) => {
                  const isSelected = form.priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() =>
                        handleChangeForm('priority', p as IncidentPriority)
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() =>
                  handleChangeForm('is_emergency', !form.is_emergency)
                }
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.checkboxOuter,
                    form.is_emergency && styles.checkboxOuterSelected,
                  ]}
                >
                  {form.is_emergency && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.toggleLabel}>This is an emergency</Text>
              </TouchableOpacity>

              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitNewIncident}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : selectedIncident ? (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchIncidents(false)} />
              }
              style={{ maxHeight: detailsMaxHeight - 28 }}
            >
              <Text style={styles.detailsTitle}>{selectedIncident.title}</Text>
              <Text style={styles.detailsStatus}>
                {selectedIncident.status.replace(/_/g, ' ')} ·{' '}
                {selectedIncident.category} · {selectedIncident.priority}
              </Text>
              {selectedIncident.is_emergency && (
                <Text style={styles.emergencyLabel}>Emergency</Text>
              )}

              {selectedIncident.description ? (
                <Text style={styles.detailsDescription}>
                  {selectedIncident.description}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleAddImageToIncident}
                activeOpacity={0.85}
              >
                <Text style={styles.addImageButtonText}>Add image</Text>
              </TouchableOpacity>

              {renderIncidentImages(selectedIncident)}

              {/* Comments */}
              <View style={styles.commentsSection}>
                <Text style={styles.commentsTitle}>Comments</Text>
                {selectedIncident.comments &&
                  selectedIncident.comments.length > 0 ? (
                  selectedIncident.comments
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    )
                    .map((c) => (
                      <View key={c.id} style={styles.commentCard}>
                        <Text style={styles.commentAuthor}>
                          {c.user_id && commentAuthors[c.user_id]
                            ? commentAuthors[c.user_id]
                            : c.user_id === profileId
                              ? ((session?.user.user_metadata?.full_name as string | undefined) ||
                                (session?.user.user_metadata?.name as string | undefined) ||
                                session?.user.email ||
                                'You')
                              : 'Unknown user'}
                        </Text>
                        <Text style={styles.commentMeta}>
                          {new Date(c.created_at).toLocaleString()}
                        </Text>
                        <Text style={styles.commentText}>
                          {c.message ?? ''}
                        </Text>
                      </View>
                    ))
                ) : (
                  <Text style={styles.emptyText}>
                    No comments yet. You can add one below.
                  </Text>
                )}

                {/* Add comment */}
                <TextInput
                  style={[styles.input, styles.commentInput]}
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.commentButton,
                    commentSubmitting && styles.commentButtonDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={commentSubmitting || !commentText.trim()}
                  activeOpacity={0.85}
                >
                  {commentSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.commentButtonText}>Post comment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
              style={{ maxHeight: detailsMaxHeight - 28 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.emptyText}>
                Select a service request from the list above or create a new one.
              </Text>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

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
                    console.log('Incident modal image loaded', { url: selectedImageUrl })
                  }
                  onError={(e) =>
                    console.error('Incident modal image failed to load', {
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

export default ServiceRequestsScreen;
