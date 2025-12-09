// app/main/profile.tsx  (or wherever you keep authenticated screens)
import { useAuth } from '@/context/auth-context';
import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

const ProfileScreen: React.FC = () => {
  const { session, signOut } = useAuth();
  const user = session?.user;

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

  const handleSignOut = async () => {
    await signOut();
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

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
                  {(user?.user_metadata?.building_name as string) || 'Not assigned'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Apartment</Text>
                <Text style={styles.detailValue}>
                  {(user?.user_metadata?.apartment_label as string) || 'Not assigned'}
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
                style={styles.primaryButton}
                onPress={() => {
                  // later: navigate to EditProfile
                  console.log('Edit profile pressed');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonLabel}>Edit profile</Text>
              </TouchableOpacity>

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
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f4f7',
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
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
});
