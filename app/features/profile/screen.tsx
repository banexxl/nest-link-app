// app/main/profile.tsx  (or wherever you keep authenticated screens)
import { useAuth } from '@/context/auth-context';
import { getTenantAddressFromTenantId, type TenantAddressInfo } from '@/lib/sb-tenant';
import { supabase } from '@/lib/supabase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

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
      const userId = session?.user?.id ?? null;
      const tenantFilterColumn = tenantId ? 'id' : 'user_id';
      const tenantFilterValue = tenantId ?? userId;

      if (!tenantFilterValue) return;

      const { data: tenant, error: tenantError } = await supabase
        .from('tblTenants')
        .select('id, avatar_url')
        .eq(tenantFilterColumn, tenantFilterValue)
        .maybeSingle();

      if (tenantError && tenantError.code !== 'PGRST116') {
        setAvatarError(tenantError.message);
        return;
      }

      const tenantRowId = tenantId ?? (tenant?.id as string | undefined) ?? null;
      setResolvedTenantId(tenantRowId);

      let nextAvatarUrl = (tenant?.avatar_url as string | null | undefined) ?? null;

      if (tenantRowId) {
        const { data: profile, error: profileError } = await supabase
          .from('tblTenantProfiles')
          .select('avatar_url')
          .eq('tenant_id', tenantRowId)
          .maybeSingle();

        if (!profileError && profile?.avatar_url) {
          nextAvatarUrl = profile.avatar_url as string;
        } else if (profileError && profileError.code !== 'PGRST116') {
          setAvatarError(profileError.message);
        }
      }

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

      const result = await getTenantAddressFromTenantId(supabase, tenantId);

      if (!result.success || !result.data) {
        setAddressError(result.error ?? 'Failed to load tenant address.');
        setTenantAddress(null);
      } else {
        setTenantAddress(result.data);
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

    const targetTenantId = resolvedTenantId ?? tenantId ?? null;
    const tenantFilterColumn = targetTenantId ? 'id' : 'user_id';
    const tenantFilterValue = targetTenantId ?? session?.user?.id;
    const valueForDb = buildAvatarUrl(option.id);

    if (!tenantFilterValue) {
      setAvatarError('Missing tenant information for avatar update.');
      return;
    }

    setAvatarSaving(true);
    setAvatarError(null);

    try {
      const { error: tenantUpdateError } = await supabase
        .from('tblTenants')
        .update({ avatar_url: valueForDb })
        .eq(tenantFilterColumn, tenantFilterValue);

      if (tenantUpdateError) {
        setAvatarError(tenantUpdateError.message);
        return;
      }

      let profileErrorMessage: string | null = null;
      if (targetTenantId) {
        const { error: profileUpdateError } = await supabase
          .from('tblTenantProfiles')
          .update({ avatar_url: valueForDb })
          .eq('tenant_id', targetTenantId);

        if (profileUpdateError) {
          profileErrorMessage = profileUpdateError.message;
        }
      }

      setAvatarUrl(valueForDb);
      setAvatarPickerVisible(false);

      if (profileErrorMessage) {
        setAvatarError(profileErrorMessage);
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

const styles = StyleSheet.create({
  root: {
    marginTop: 30,
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  topCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5,
  },
  avatarButton: {
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  editAvatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#666',
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    columnGap: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f7f7fb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    minWidth: 120,
  },
  tagLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  tagValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  detailsCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#222',
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  actionsCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    marginBottom: 10,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9534f',
    backgroundColor: 'rgba(217,83,79,0.06)',
  },
  secondaryButtonLabel: {
    color: '#d9534f',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  closeButton: {
    fontSize: 18,
    color: '#444',
    fontWeight: '700',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarChoice: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#f7f7fb',
    marginBottom: 12,
  },
  avatarChoiceSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(246,138,0,0.08)',
  },
  avatarChoiceImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 6,
  },
  avatarChoiceLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  avatarSelectedTag: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  avatarSavingSpinner: {
    marginTop: 10,
  },
  avatarError: {
    marginTop: 6,
    fontSize: 12,
    color: '#d00',
    textAlign: 'center',
  },
});
