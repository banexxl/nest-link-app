// app/main/service-requests.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import Loader from '@/components/loader';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getBuildingIdFromUserId, getClientIdFromAuthUser } from '@/lib/sb-tenant';
import { signFileUrl } from '@/lib/sign-file';
import { supabase } from '@/lib/supabase';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

type IncidentCategory =
  | 'plumbing'
  | 'electrical'
  | 'noise'
  | 'cleaning'
  | 'common_area'
  | 'heating'
  | 'cooling'
  | 'structural'
  | 'interior'
  | 'outdoorsafety'
  | 'security'
  | 'pests'
  | 'administrative'
  | 'parking'
  | 'it'
  | 'waste'

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

type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent' | string;

type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | string;

type Incident = {
  id: string;
  client_id: string | null;
  building_id: string | null;
  apartment_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  is_emergency: boolean;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  reported_by: string | null;
  images?: IncidentImage[];
  comments?: IncidentComment[];
};

type IncidentImage = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

type IncidentComment = {
  id: string;
  user_id: string | null;
  message: string | null;
  created_at: string;
};

type NewIncidentForm = {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  is_emergency: boolean;
};

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
        const { data, error } = await supabase
          .from('tblIncidentReports')
          .select(
            `
            id,
            client_id,
            building_id,
            apartment_id,
            assigned_to,
            title,
            description,
            category,
            priority,
            status,
            is_emergency,
            created_at,
            resolved_at,
            closed_at,
            reported_by,
            images:tblIncidentReportImages (
              id,
              storage_bucket,
              storage_path
            ),
            comments:tblIncidentReportComments (
              id,
              user_id,
              message,
              created_at
            )
          `
          )
          // user-specific filter: reported_by
          // .eq('reported_by', profileId)
          .eq('building_id', buildingId)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
          setIncidents([]);
        } else {
          const result = (data ?? []) as Incident[];
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
        const result = await getBuildingIdFromUserId(supabase, profileId);
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
  }, [profileId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents(false);
  };

  // pre-sign image urls
  useEffect(() => {
    const signAll = async () => {
      const toSign: { key: string; bucket: string; path: string }[] = [];

      incidents.forEach((inc) => {
        (inc.images ?? []).forEach((img) => {
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

    if (incidents.length > 0) {
      signAll();
    }
  }, [incidents, signedUrls]);

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
        const { data, error } = await supabase
          .from('tblTenants')
          .select('user_id, full_name')
          .in('user_id', Array.from(idsToResolve));

        if (error) {
          return;
        }

        if (!data) return;

        setCommentAuthors((prev) => {
          const next = { ...prev };
          (data as any[]).forEach((row) => {
            const uid = row.user_id as string | null;
            const name = (row.full_name as string | null) ?? null;
            if (uid && name) {
              next[uid] = name;
            }
          });
          return next;
        });
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
      // 🔹 FIRST: resolve client + building + apartment from auth user
      const result = await getClientIdFromAuthUser(supabase, profileId);

      if (!result.success || !result.data) {
        setFormError(result.error ?? 'Could not resolve client/building for this tenant.');
        setSubmitting(false);
        return;
      }

      const { clientId, buildingId, apartmentId } = result.data;

      const payload = {
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
      };

      const { data, error } = await supabase
        .from('tblIncidentReports')
        .insert(payload)
        .select(
          `
        id,
        client_id,
        building_id,
        apartment_id,
        assigned_to,
        title,
        description,
        category,
        priority,
        status,
        is_emergency,
        created_at,
        resolved_at,
        closed_at,
        reported_by,
        images:tblIncidentReportImages (
          id,
          storage_bucket,
          storage_path
        ),
        comments:tblIncidentReportComments (
          id,
          user_id,
          message,
          created_at
        )
      `
        )
        .single();

      if (error) {
        setFormError(error.message ?? 'Failed to create service request.');
      } else if (data) {
        let newIncident = data as Incident;

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
            }
          } catch (uploadErr) {
            console.warn('Failed to upload incident image', uploadErr);
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
  };


  const handleSubmitComment = async () => {
    if (!selectedIncident || !profileId) return;
    const msg = commentText.trim();
    if (!msg) return;

    setCommentSubmitting(true);
    try {
      const payload = {
        incident_id: selectedIncident.id,
        user_id: profileId,
        message: msg,
      };

      const { data, error } = await supabase
        .from('tblIncidentReportComments')
        .insert(payload)
        .select('id, user_id, message, created_at')
        .single();

      if (error) {
        console.log('Error adding comment:', error);
      } else if (data) {
        const newComment = data as IncidentComment;
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === selectedIncident.id
              ? {
                ...inc,
                comments: [...(inc.comments ?? []), newComment],
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
  };

  const renderIncidentItem = ({ item }: { item: Incident }) => {
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    // 1) Prefer an already working URL
    let url: any = signedUrls[key] ?? null;

    // 2) If we don’t have it yet, sign it once
    if (!url) {
      url = await signFileUrl({
        bucket: img.storage_bucket,
        path: img.storage_path,
        ttlSeconds: 60 * 20,
      });

      if (!url) {
        console.error('openIncidentImage failed to sign URL', { key });
        return;
      }

      setSignedUrls((prev) => ({ ...prev, [key]: url! }));
    }

    setSelectedImageUrl(url);
  };


  const renderIncidentImages = (incident: Incident) => {
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
    color: '#ed9633ff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  newButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  listContainer: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  incidentCard: {
    width: 230,
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
  incidentCardSelected: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  incidentCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  incidentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  emergencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(220,0,0,0.1)',
    marginLeft: 6,
  },
  emergencyPillText: {
    fontSize: 11,
    color: '#d00',
    fontWeight: '600',
  },
  incidentMeta: {
    fontSize: 11,
    color: '#666',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  detailsStatus: {
    fontSize: 12,
    color: '#666',
  },
  emergencyLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#d00',
    fontWeight: '600',
  },
  detailsDescription: {
    marginTop: 8,
    fontSize: 13,
    color: '#333',
  },
  imageThumb: {
    width: 90,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  imagePlaceholder: {
    width: 90,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  commentCard: {
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  commentMeta: {
    fontSize: 11,
    color: '#777',
  },
  commentText: {
    marginTop: 2,
    fontSize: 13,
    color: '#333',
  },
  commentInput: {
    marginTop: 8,
    minHeight: 60,
  },
  commentButton: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  commentButtonDisabled: {
    opacity: 0.7,
  },
  commentButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addImageButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  addImageButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    textAlign: 'center',
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(246,138,0,0.1)',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  toggleLabel: {
    fontSize: 13,
    color: '#333',
  },
  formError: {
    marginTop: 6,
    fontSize: 12,
    color: '#d00',
  },
  capturedPhotoWrapper: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f7f7fb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  photoLabel: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  capturedPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#ddd',
  },
  removePhotoButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  removePhotoText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 13,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
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
