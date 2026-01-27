import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { InventoryItem, CATEGORIES } from '../../types';
import { colors, typography, spacing, radius } from '../../theme';

// Shared Components
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';

// Domain Components
import { InventoryItemCard } from '../../components/inventory/InventoryItemCard';
import { InventoryHeader } from '../../components/inventory/InventoryHeader';
import { InventoryFilters } from '../../components/inventory/InventoryFilters';

// Utils
import { mergeInventoryItems, MergedInventoryItem } from '../../utils/inventoryMerge';

// We'll keep the consumption modal logic and edit modal logic here for now, or extract further if needed.
// For brevity in this refactor, I will inline the modals but use the new style tokens.

export default function InventoryScreen() {
  const router = useRouter();

  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MergedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Modals & Selection
  const [selectedItem, setSelectedItem] = useState<MergedInventoryItem | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  // Consume state
  const [consumeQuantity, setConsumeQuantity] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'category'>('expiry');
  const [showFilters, setShowFilters] = useState(false);

  // Initial Animation
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Sync Display Items
  useEffect(() => {
    if (items.length > 0) {
      const merged = mergeInventoryItems(items);
      setDisplayItems(merged);
    } else {
      setDisplayItems([]);
    }
  }, [items]);

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

  const handleItemPress = (item: MergedInventoryItem) => {
    setSelectedItem(item);
    setShowActionModal(true);
  };

  const handleAddItem = () => {
    router.push('/add-item');
  };

  // Helper for counts
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const statusCounts = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let fresh = 0;
    items.forEach(item => {
      const days = getDaysUntilExpiry(item.expiry_date);
      if (days < 0) expired++;
      else if (days <= 3) expiringSoon++;
      else fresh++;
    });
    return { expired, expiringSoon, fresh, total: items.length };
  }, [items]);

  // Filter Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = [...displayItems];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.name.toLowerCase().includes(query));
    }

    if (selectedCategory) {
      result = result.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (expiryFilter !== 'all') {
      result = result.filter(item => {
        const days = getDaysUntilExpiry(item.expiry_date);
        if (expiryFilter === 'expired') return days < 0;
        if (expiryFilter === 'expiring') return days >= 0 && days <= 3;
        return true;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'category': return a.category.localeCompare(b.category) || new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'expiry': default: return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      }
    });

    return result;
  }, [displayItems, searchQuery, selectedCategory, expiryFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setExpiryFilter('all');
    setSortBy('expiry');
  };

  // --- Edit Logic ---
  const handleEditPress = () => {
    if (!selectedItem) return;
    setEditName(selectedItem.name);
    setEditCategory(selectedItem.category);
    setEditQuantity(String(selectedItem.quantity));
    setEditUnit(selectedItem.unit);
    setEditExpiryDate(selectedItem.expiry_date);
    setShowActionModal(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      // Update all merged items
      for (const id of selectedItem.mergedIds) {
        await api.updateInventoryItem(id, {
          name: editName,
          category: editCategory.toLowerCase(),
          quantity: parseFloat(editQuantity) / selectedItem.mergedIds.length,
          unit: editUnit.toLowerCase(),
          storage_location: 'fridge',
          expiry_date: editExpiryDate,
        });
      }
      fetchInventory();
      setShowEditModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Consume Logic ---
  const handleConsumePress = () => {
    if (!selectedItem) return;
    setConsumeQuantity(Math.min(1, selectedItem.quantity));
    setShowActionModal(false);
    setShowConsumeModal(true);
  };

  const handleConsumeSave = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const remaining = selectedItem.quantity - consumeQuantity;
      if (remaining <= 0) {
        // Delete all merged items
        await Promise.all(selectedItem.mergedIds.map(id => api.deleteInventoryItem(id)));
      } else {
        // Update first item with remaining quantity, delete others if needed
        const firstId = selectedItem.mergedIds[0];
        await api.updateInventoryItem(firstId, {
          name: selectedItem.name,
          category: selectedItem.category.toLowerCase(),
          quantity: remaining,
          unit: selectedItem.unit.toLowerCase(),
          storage_location: 'fridge',
          expiry_date: selectedItem.expiry_date,
        });
        // Delete other merged items
        for (let i = 1; i < selectedItem.mergedIds.length; i++) {
          await api.deleteInventoryItem(selectedItem.mergedIds[i]);
        }
      }
      fetchInventory();
      setShowConsumeModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Deletion Logic ---
  const handleDelete = async () => {
    if (!selectedItem) return;
    Alert.alert('Delete', `Delete ${selectedItem.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(selectedItem.mergedIds.map(id => api.deleteInventoryItem(id)));
            fetchInventory();
            setShowActionModal(false);
          } catch (e: any) { Alert.alert('Error', e.message) }
        }
      }
    ]);
  };

  return (
    <Screen safeArea={true} padding={false} style={{ backgroundColor: colors.background.primary }}>
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <InventoryHeader statusCounts={statusCounts} />
        {items.length > 0 && (
          <InventoryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            expiryFilter={expiryFilter}
            onExpiryFilterChange={setExpiryFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        )}
      </Animated.View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.sage} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="basket-outline" size={64} color={colors.primary.sageLight} />
          </View>
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptySubtext}>Start by adding food items to track freshness.</Text>
          <Button label="Add Your First Item" icon="add" onPress={handleAddItem} />
        </View>
      ) : filteredAndSortedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.text.muted} />
          <Text style={[styles.emptyTitle, { fontSize: typography.size.lg, marginTop: spacing.md }]}>No items found</Text>
          <TouchableOpacity onPress={clearFilters} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.primary.sage, fontWeight: '600' }}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(item) => item.mergedIds.join('-')}
          renderItem={({ item }) => (
            <InventoryItemCard
              item={item}
              onPress={handleItemPress}
              style={{ marginBottom: spacing.md }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.sage} />
          }
        />
      )}

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Button
          variant="primary"
          size="lg"
          label=""
          icon="add"
          onPress={handleAddItem}
          style={{ width: 64, height: 64, borderRadius: 32, paddingHorizontal: 0 }}
        />
      </View>

      {/* Action Bottom Sheet */}
      <BottomSheet visible={showActionModal} onClose={() => setShowActionModal(false)}>
        {selectedItem && (
          <>
            <Text style={styles.actionTitle}>{selectedItem.name}</Text>
            <Text style={styles.actionSubtitle}>{selectedItem.quantity} {selectedItem.unit}</Text>

            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <Button label="Edit Item" variant="secondary" onPress={handleEditPress} icon="pencil" />
              <Button label="Mark as Consumed" variant="primary" onPress={handleConsumePress} icon="checkmark-circle" />
              <Button label="Delete" variant="danger" onPress={handleDelete} icon="trash" />
            </View>
          </>
        )}
      </BottomSheet>

      {/* Edit Bottom Sheet */}
      <BottomSheet visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <Text style={styles.actionTitle}>Edit Item</Text>

        <ScrollView style={{ marginTop: spacing.lg, maxHeight: 400 }}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
          />

          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, editCategory.toLowerCase() === cat.toLowerCase() && styles.chipSelected]}
                onPress={() => setEditCategory(cat)}
              >
                <Text style={[styles.chipText, editCategory.toLowerCase() === cat.toLowerCase() && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={editQuantity}
            onChangeText={setEditQuantity}
            keyboardType="numeric"
            placeholder="Quantity"
          />

          <Text style={styles.inputLabel}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {['Pieces', 'Grams', 'Kilograms', 'Milliliters', 'Liters'].map(unit => (
              <TouchableOpacity
                key={unit}
                style={[styles.chip, editUnit.toLowerCase() === unit.toLowerCase() && styles.chipSelected]}
                onPress={() => setEditUnit(unit)}
              >
                <Text style={[styles.chipText, editUnit.toLowerCase() === unit.toLowerCase() && styles.chipTextSelected]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            value={editExpiryDate}
            onChangeText={setEditExpiryDate}
            placeholder="YYYY-MM-DD"
          />
        </ScrollView>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button label="Save Changes" variant="primary" onPress={handleEditSave} loading={actionLoading} />
        </View>
      </BottomSheet>

      {/* Consume Bottom Sheet */}
      <BottomSheet visible={showConsumeModal} onClose={() => setShowConsumeModal(false)}>
        {selectedItem && (
          <>
            <Text style={styles.actionTitle}>Mark as Consumed</Text>
            <Text style={styles.actionSubtitle}>{selectedItem.name} • {selectedItem.quantity} {selectedItem.unit} available</Text>

            {/* Quick percentage buttons */}
            <View style={styles.quickButtons}>
              {[25, 50, 75, 100].map(percent => (
                <TouchableOpacity
                  key={percent}
                  style={[
                    styles.quickButton,
                    consumeQuantity === (selectedItem.quantity * percent / 100) && styles.quickButtonActive
                  ]}
                  onPress={() => setConsumeQuantity(Math.round(selectedItem.quantity * percent / 100 * 10) / 10)}
                >
                  <Text style={[
                    styles.quickButtonText,
                    consumeQuantity === (selectedItem.quantity * percent / 100) && styles.quickButtonTextActive
                  ]}>
                    {percent === 100 ? 'All' : `${percent}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Direct quantity input */}
            <View style={styles.consumeInputRow}>
              <TextInput
                style={styles.consumeInput}
                value={String(consumeQuantity)}
                onChangeText={(text) => {
                  const num = parseFloat(text) || 0;
                  setConsumeQuantity(Math.min(selectedItem.quantity, Math.max(0, num)));
                }}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.consumeInputUnit}>{selectedItem.unit}</Text>
            </View>

            <Text style={styles.remainingText}>
              {selectedItem.quantity - consumeQuantity <= 0
                ? 'This will remove the item completely'
                : `${(selectedItem.quantity - consumeQuantity).toFixed(1)} ${selectedItem.unit} remaining`}
            </Text>

            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <Button
                label={selectedItem.quantity - consumeQuantity <= 0 ? 'Remove Item' : 'Confirm'}
                variant="primary"
                onPress={handleConsumeSave}
                loading={actionLoading}
              />
            </View>
          </>
        )}
      </BottomSheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    backgroundColor: colors.background.primary,
    zIndex: 10,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: 100, // For FAB
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.base,
  },
  actionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    height: 48,
    paddingHorizontal: spacing.base,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary.sage,
  },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  remainingText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  quickButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    minWidth: 56,
    alignItems: 'center',
  },
  quickButtonActive: {
    backgroundColor: colors.primary.sage,
  },
  quickButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  quickButtonTextActive: {
    color: colors.text.inverse,
  },
  consumeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  consumeInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 100,
  },
  consumeInputUnit: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
});
