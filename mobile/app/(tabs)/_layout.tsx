import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { colors, radius, shadows, typography, spacing } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary.sage,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.background.card,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          paddingHorizontal: spacing.base,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.body,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
          marginTop: 4,
        },
        tabBarItemStyle: {
          borderRadius: radius.md,
          marginHorizontal: 4,
        },
        headerStyle: {
          backgroundColor: colors.primary.sage,
          ...shadows.base,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.body,
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.lg,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Pantry',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons name={focused ? 'basket' : 'basket-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.primary.sageMuted,
  },
});
