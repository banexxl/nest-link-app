// app/main/profile.tsx  (or wherever you keep authenticated screens)
import { useAuth } from '@/context/auth-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {
  TenantAddressInfo,
  fetchTenantAddress,
  loadAvatarData,
  updateAvatarData,
} from './server-actions';
import { PRIMARY_COLOR, styles } from './styles';

type AvatarOption = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'avatar-alcides-antonio.png',
    label: 'Alcides Antonio',
    source: require('@/assets/avatars/avatar-alcides-antonio.png'),
  },
  {
    id: 'avatar-anika-visser.png',
    label: 'Anika Visser',
    source: require('@/assets/avatars/avatar-anika-visser.png'),
  },
  {
    id: 'avatar-cao-yu.png',
    label: 'Cao Yu',
    source: require('@/assets/avatars/avatar-cao-yu.png'),
  },
  {
    id: 'avatar-carson-darrin.png',
    label: 'Carson Darrin',
    source: require('@/assets/avatars/avatar-carson-darrin.png'),
  },
  {
    id: 'avatar-chinasa-neo.png',
    label: 'Chinasa Neo',
    source: require('@/assets/avatars/avatar-chinasa-neo.png'),
  },
  {
    id: 'avatar-fran-perez.png',
    label: 'Fran Perez',
    source: require('@/assets/avatars/avatar-fran-perez.png'),
  },
  {
    id: 'avatar-iulia-albu.png',
    label: 'Iulia Albu',
    source: require('@/assets/avatars/avatar-iulia-albu.png'),
  },
  {
    id: 'avatar-jane-rotanson.png',
    label: 'Jane Rotanson',
    source: require('@/assets/avatars/avatar-jane-rotanson.png'),
  },
  {
    id: 'avatar-jie-yan-song.png',
    label: 'Jie Yan Song',
    source: require('@/assets/avatars/avatar-jie-yan-song.png'),
  },
  {
    id: 'avatar-marcus-finn.png',
    label: 'Marcus Finn',
    source: require('@/assets/avatars/avatar-marcus-finn.png'),
  },
  {
    id: 'avatar-miron-vitold.png',
    label: 'Miron Vitold',
    source: require('@/assets/avatars/avatar-miron-vitold.png'),
  },
  {
    id: 'avatar-nasimiyu-danai.png',
    label: 'Nasimiyu Danai',
    source: require('@/assets/avatars/avatar-nasimiyu-danai.png'),
  },
  {
    id: 'avatar-neha-punita.png',
    label: 'Neha Punita',
    source: require('@/assets/avatars/avatar-neha-punita.png'),
  },
  {
    id: 'avatar-omar-darboe.png',
    label: 'Omar Darboe',
    source: require('@/assets/avatars/avatar-omar-darboe.png'),
  },
  {
    id: 'avatar-penjani-inyene.png',
    label: 'Penjani Inyene',
    source: require('@/assets/avatars/avatar-penjani-inyene.png'),
  },
  {
    id: 'avatar-seo-hyeon-ji.png',
    label: 'Seo Hyeon Ji',
    source: require('@/assets/avatars/avatar-seo-hyeon-ji.png'),
  },
  {
    id: 'avatar-siegbert-gottfried.png',
    label: 'Siegbert Gottfried',
    source: require('@/assets/avatars/avatar-siegbert-gottfried.png'),
  },
];

const buildAvatarUrl = (fileName: string) => `assets/avatars/${fileName}`;

const ProfileScreen: React.FC = () => {
  const { session, signOut, tenantId } = useAuth();
  const user = session?.user;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [tenantAddress, setTenantAddress] = useState<TenantAddressInfo | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    'User';
  const email = user?.email ?? 'unknown@n/a';
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const selectedAvatarKey = useMemo(() => {
    if (!avatarUrl) return null;
    const normalized = avatarUrl.toLowerCase();
    const match = AVATAR_OPTIONS.find((opt) =>
      normalized.includes(opt.id.toLowerCase())
    );
    return match?.id ?? null;
  }, [avatarUrl]);

  const avatarSource = useMemo(() => {
    if (selectedAvatarKey) {
      const option = AVATAR_OPTIONS.find((opt) => opt.id === selectedAvatarKey);
      if (option) return option.source;
    }

    if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
      return { uri: avatarUrl };
    }

    return null;
  }, [avatarUrl, selectedAvatarKey]);

  const loadAvatar = useCallback(async () => {
    if (!session?.user?.id && !tenantId) return;

    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const { avatarUrl: nextAvatarUrl, resolvedTenantId: nextTenantId, error } =
        await loadAvatarData({
          sessionUserId: session?.user?.id ?? null,
          tenantId,
        });

      if (error) {
        setAvatarError(error);
      }

      setResolvedTenantId(nextTenantId);
      setAvatarUrl(nextAvatarUrl);
    } catch (error: any) {
      setAvatarError(error?.message ?? 'Failed to load avatar.');
    } finally {
      setAvatarLoading(false);
    }
  }, [session?.user?.id, tenantId]);

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!tenantId) return;

      setAddressLoading(true);
      setAddressError(null);

      const { address, error } = await fetchTenantAddress(tenantId);

      if (error) {
        setAddressError(error);
        setTenantAddress(null);
      } else {
        setTenantAddress(address);
      }

      setAddressLoading(false);
    };

    fetchAddress();
  }, [tenantId]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSelectAvatar = async (option: AvatarOption) => {
    if (!session?.user?.id && !resolvedTenantId && !tenantId) {
      setAvatarError('No active session found.');
      return;
    }

    const valueForDb = buildAvatarUrl(option.id);

    setAvatarSaving(true);
    setAvatarError(null);

    try {
      const { error, resolvedTenantId: nextResolvedTenantId } = await updateAvatarData({
        sessionUserId: session?.user?.id ?? null,
        tenantId,
        resolvedTenantId,
        avatarPath: valueForDb,
      });

      setAvatarUrl(valueForDb);
      setResolvedTenantId((prev) => prev ?? nextResolvedTenantId ?? null);
      setAvatarPickerVisible(false);

      if (error) {
        setAvatarError(error);
      }
    } catch (error: any) {
      setAvatarError(error?.message ?? 'Failed to update avatar.');
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('@/assets/images/login-bg.png')}
        style={styles.background}
        resizeMode="cover"
        blurRadius={6}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top profile card */}
            <View style={styles.topCard}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => setAvatarPickerVisible(true)}
                activeOpacity={0.85}
                disabled={avatarLoading}
              >
                <View style={styles.avatar}>
                  {avatarLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : avatarSource ? (
                    <Image source={avatarSource} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                </View>
                <Text style={styles.editAvatarLabel}>Edit avatar</Text>
              </TouchableOpacity>

              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.email}>{email}</Text>

              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Role</Text>
                  <Text style={styles.tagValue}>
                    {(user?.user_metadata?.role as string) || 'Tenant / Manager'}
                  </Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Status</Text>
                  <Text style={styles.tagValue}>Active</Text>
                </View>
              </View>
            </View>

            {/* Details card */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Account details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Full name</Text>
                <Text style={styles.detailValue}>{fullName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{email}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Building</Text>
                <Text style={styles.detailValue}>
                  {addressLoading
                    ? 'Loading...'
                    : tenantAddress
                      ? `${tenantAddress.streetAddress} ${tenantAddress.buildingNumber}, ${tenantAddress.city}`
                      : 'Not assigned'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Apartment</Text>
                <Text style={styles.detailValue}>
                  {addressLoading
                    ? 'Loading...'
                    : tenantAddress?.apartmentNumber || 'Not assigned'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>
                  {(user?.user_metadata?.phone as string) || 'Not provided'}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonLabel}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      {addressError ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: '#d00', fontSize: 12, textAlign: 'center' }}>
            {addressError}
          </Text>
        </View>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={avatarPickerVisible}
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose an avatar</Text>
              <TouchableOpacity
                onPress={() => setAvatarPickerVisible(false)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.avatarGrid}
              showsVerticalScrollIndicator={false}
            >
              {AVATAR_OPTIONS.map((option) => {
                const isSelected = selectedAvatarKey === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.avatarChoice,
                      isSelected && styles.avatarChoiceSelected,
                    ]}
                    onPress={() => handleSelectAvatar(option)}
                    activeOpacity={0.85}
                    disabled={avatarSaving}
                  >
                    <Image
                      source={option.source}
                      style={styles.avatarChoiceImage}
                    />
                    <Text style={styles.avatarChoiceLabel}>{option.label}</Text>
                    {isSelected ? (
                      <Text style={styles.avatarSelectedTag}>Selected</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {avatarSaving ? (
              <ActivityIndicator
                size="small"
                color={PRIMARY_COLOR}
                style={styles.avatarSavingSpinner}
              />
            ) : null}
            {avatarError ? (
              <Text style={styles.avatarError}>{avatarError}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;
