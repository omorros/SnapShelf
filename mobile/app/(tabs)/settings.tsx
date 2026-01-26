import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { useAuth } from '../../services/auth';
import { User } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button'; // Assuming Button is available

const STORAGE_LOCATIONS = ['Fridge', 'Pantry', 'Freezer', 'Cupboard'] as const;
const STORAGE_LOCATION_KEY = 'default_storage_location';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultStorageLocation, setDefaultStorageLocation] = useState('Fridge');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Animation
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      loadPreferences();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error: any) {
      console.log('Failed to fetch user profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const storedLocation = await SecureStore.getItemAsync(STORAGE_LOCATION_KEY);
      if (storedLocation) {
        setDefaultStorageLocation(storedLocation);
      }
    } catch (error) {
      console.log('Failed to load preferences');
    }
  };

  const saveStorageLocation = async (location: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_LOCATION_KEY, location);
      setDefaultStorageLocation(location);
    } catch (error) {
      Alert.alert('Error', 'Failed to save preference');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.sage} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <Screen safeArea={true} padding={false} style={{ backgroundColor: colors.background.primary }}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color={colors.primary.sage} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail}>{user?.email || 'Unknown'}</Text>
              <Text style={styles.profileDate}>
                Member since {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
              </Text>
            </View>
          </Card>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Default Storage Location */}
          <Card style={styles.preferenceCard}>
            <View style={styles.preferenceHeader}>
              <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.preferenceLabel}>Default Storage Location</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              New items will use this location by default
            </Text>
            <View style={styles.locationChips}>
              {STORAGE_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.locationChip,
                    defaultStorageLocation === location && styles.locationChipActive,
                  ]}
                  onPress={() => saveStorageLocation(location)}
                >
                  <Text
                    style={[
                      styles.locationChipText,
                      defaultStorageLocation === location && styles.locationChipTextActive,
                    ]}
                  >
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Notifications */}
          <Card style={styles.preferenceCard}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
                <View style={styles.preferenceTextContainer}>
                  <Text style={styles.preferenceLabel}>Expiry Notifications</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.ui.border, true: colors.primary.sageMuted }}
                thumbColor={notificationsEnabled ? colors.primary.sage : colors.background.card}
                disabled={true}
              />
            </View>
            <Text style={styles.preferenceDescription}>
              Get notified when items are about to expire
            </Text>
          </Card>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2026.01</Text>
            </View>
          </Card>
        </View>

        {/* Logout Button */}
        <Button
          label="Logout"
          variant="danger"
          onPress={handleLogout}
          icon="log-out-outline"
          style={{ marginTop: spacing.md }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },

  // Preference Card
  preferenceCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  preferenceTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preferenceLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  preferenceDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  comingSoonBadge: {
    backgroundColor: colors.status.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  comingSoonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.status.warning,
  },

  // Location Chips
  locationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.xs,
  },
  locationChipActive: {
    backgroundColor: colors.primary.sage,
  },
  locationChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  locationChipTextActive: {
    color: colors.text.inverse,
  },

  // Info Card
  infoCard: {
    padding: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  infoValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
});
