import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { InventoryItem } from '../../types';
import { useAuth } from '../../services/auth';

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const fetchInventory = async () => {
    try {
      const data = await api.getInventoryItems();
      setItems(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert(
      'Mark as Used',
      `Remove "${item.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await api.deleteInventoryItem(item.id);
              setItems(items.filter((i) => i.id !== item.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => logout() },
    ]);
  };

  const handleAddItem = () => {
    router.push('/add-item');
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return '#d32f2f';
    if (days <= 2) return '#f57c00';
    if (days <= 5) return '#fbc02d';
    return '#2e7d32';
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      fruits: 'nutrition',
      vegetables: 'leaf',
      dairy: 'water',
      meat: 'restaurant',
      fish: 'fish',
      grains: 'grid',
      snacks: 'fast-food',
      beverages: 'cafe',
      frozen: 'snow',
      condiments: 'flask',
      other: 'cube',
    };
    return iconMap[category?.toLowerCase()] || 'cube';
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      fruits: '#FF6B6B',
      vegetables: '#4ECDC4',
      dairy: '#45B7D1',
      meat: '#E17055',
      fish: '#74B9FF',
      grains: '#FDCB6E',
      snacks: '#A29BFE',
      beverages: '#55A3FF',
      frozen: '#81ECEC',
      condiments: '#FD79A8',
      other: '#B2BEC3',
    };
    return colorMap[category?.toLowerCase()] || '#B2BEC3';
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const expiryColor = getExpiryColor(daysUntilExpiry);
    const categoryIcon = getCategoryIcon(item.category);
    const categoryColor = getCategoryColor(item.category);

    const expiryText =
      daysUntilExpiry < 0
        ? 'Expired'
        : daysUntilExpiry === 0
        ? 'Expires today'
        : `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} remaining`;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIcon, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={categoryIcon} size={24} color={categoryColor} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.expiryRow}>
            <View style={[styles.expiryDot, { backgroundColor: expiryColor }]} />
            <Text style={[styles.expiryText, { color: expiryColor }]}>{expiryText}</Text>
          </View>
        </View>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9', '#a5d6a7']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Foods</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#2e7d32" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={80} color="#2e7d32" />
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add food to your inventory
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#2e7d32"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleAddItem} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  logoutButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2e7d32',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2e7d32',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#4a4a4a',
    marginTop: 8,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expiryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
