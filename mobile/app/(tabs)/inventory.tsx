import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { InventoryItem, CATEGORIES, UNITS } from '../../types';
import theme, { colors, typography, spacing, radius, shadows, getExpiryColor, getCategoryColor, getCategoryIcon } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Extended type for merged items
interface MergedInventoryItem extends InventoryItem {
  mergedIds: string[];  // All IDs of items merged into this one
  mergedCount: number;  // How many items were merged
}

// Merge items with same name and expiry date
const mergeInventoryItems = (items: InventoryItem[]): MergedInventoryItem[] => {
  const mergeMap = new Map<string, MergedInventoryItem>();

  items.forEach((item) => {
    // Create a key based on name (lowercase) and expiry date
    const key = `${item.name.toLowerCase().trim()}_${item.expiry_date}`;

    if (mergeMap.has(key)) {
      // Merge with existing item
      const existing = mergeMap.get(key)!;
      existing.quantity += item.quantity;
      existing.mergedIds.push(item.id);
      existing.mergedCount += 1;
    } else {
      // Create new merged item
      mergeMap.set(key, {
        ...item,
        mergedIds: [item.id],
        mergedCount: 1,
      });
    }
  });

  return Array.from(mergeMap.values());
};

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MergedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  // Item action modal state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    quantity: 1,
    unit: '',
    expiryDate: '',
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Consume modal state
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [consumeQuantity, setConsumeQuantity] = useState(1);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'category'>('expiry');
  const [showFilters, setShowFilters] = useState(false);

  // Initial animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();
  }, []);

  // Keep displayItems in sync with items changes (for edit/consume/delete operations)
  useEffect(() => {
    if (items.length > 0) {
      const merged = mergeInventoryItems(items);
      merged.sort((a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );
      setDisplayItems(merged);
    } else {
      setDisplayItems([]);
    }
  }, [items]);

  const fetchInventory = async () => {
    try {
      const data = await api.getInventoryItems();
      // Sort by expiry date - displayItems will be updated by useEffect
      const sorted = data.sort((a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );
      setItems(sorted);
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
    // For merged items, select the first underlying item for operations
    // but store the merged info for display
    const originalItem = items.find((i) => i.id === item.mergedIds[0]);
    if (originalItem) {
      setSelectedItem({
        ...originalItem,
        quantity: item.quantity, // Use merged quantity for display
      });
    }
    setShowActionModal(true);
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    setEditForm({
      name: selectedItem.name,
      category: selectedItem.category,
      quantity: selectedItem.quantity,
      unit: selectedItem.unit,
      expiryDate: selectedItem.expiry_date,
    });
    setShowActionModal(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await api.updateInventoryItem(selectedItem.id, {
        name: editForm.name,
        category: editForm.category.toLowerCase(),
        quantity: editForm.quantity,
        unit: editForm.unit.toLowerCase(),
        expiry_date: editForm.expiryDate,
      });
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsume = () => {
    if (!selectedItem) return;
    setConsumeQuantity(1);
    setShowActionModal(false);
    setShowConsumeModal(true);
  };

  const confirmConsume = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const remaining = selectedItem.quantity - consumeQuantity;

      if (remaining <= 0) {
        await api.deleteInventoryItem(selectedItem.id);
        setItems(items.filter((i) => i.id !== selectedItem.id));
      } else {
        const updated = await api.updateInventoryItem(selectedItem.id, {
          quantity: remaining,
        });
        setItems(items.map((i) => (i.id === updated.id ? updated : i)));
      }

      setShowConsumeModal(false);
      setSelectedItem(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${selectedItem.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.deleteInventoryItem(selectedItem.id);
              setItems(items.filter((i) => i.id !== selectedItem.id));
              setShowActionModal(false);
              setSelectedItem(null);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Count items by status
  const getStatusCounts = () => {
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
  };

  // Filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...displayItems];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(item =>
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Expiry status filter
    if (expiryFilter !== 'all') {
      result = result.filter(item => {
        const days = getDaysUntilExpiry(item.expiry_date);
        if (expiryFilter === 'expired') return days < 0;
        if (expiryFilter === 'expiring') return days >= 0 && days <= 3;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category) ||
                 new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'expiry':
        default:
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
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

  const renderInventoryItem = ({ item, index }: { item: MergedInventoryItem; index: number }) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const expiryInfo = getExpiryColor(daysUntilExpiry);
    const categoryColor = getCategoryColor(item.category);
    const categoryIconName = getCategoryIcon(item.category);

    return (
      <Animated.View
        style={[
          styles.itemCard,
          {
            opacity: headerOpacity,
            transform: [{
              translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <Pressable
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.itemCardInner,
            pressed && styles.itemCardPressed,
          ]}
        >
          {/* Category Icon */}
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '15' }]}>
            <Ionicons name={categoryIconName as any} size={22} color={categoryColor} />
          </View>

          {/* Item Info */}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <View style={[styles.expiryBadge, { backgroundColor: expiryInfo.background }]}>
                <View style={[styles.expiryDot, { backgroundColor: expiryInfo.text }]} />
                <Text style={[styles.expiryText, { color: expiryInfo.text }]}>
                  {expiryInfo.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <Text style={styles.unitText}>{item.unit}</Text>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </Pressable>
      </Animated.View>
    );
  };

  const statusCounts = getStatusCounts();

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Your Pantry</Text>
            <Text style={styles.headerTitle}>My Foods</Text>
          </View>
        </View>

        {/* Status Pills */}
        {items.length > 0 && (
          <View style={styles.statusRow}>
            {statusCounts.expired > 0 && (
              <View style={[styles.statusPill, { backgroundColor: colors.status.expiredBg }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.status.expired }]} />
                <Text style={[styles.statusText, { color: colors.status.expired }]}>
                  {statusCounts.expired} expired
                </Text>
              </View>
            )}
            {statusCounts.expiringSoon > 0 && (
              <View style={[styles.statusPill, { backgroundColor: colors.status.warningBg }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.status.warning }]} />
                <Text style={[styles.statusText, { color: colors.status.warning }]}>
                  {statusCounts.expiringSoon} expiring soon
                </Text>
              </View>
            )}
            <View style={[styles.statusPill, { backgroundColor: colors.primary.sageMuted }]}>
              <Text style={[styles.statusText, { color: colors.primary.sage }]}>
                {statusCounts.total} items
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Search Bar */}
      {items.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? colors.text.inverse : colors.primary.sage}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Panel */}
      {showFilters && items.length > 0 && (
        <View style={styles.filterPanel}>
          {/* Category Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Expiry Status Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChips}>
              {(['all', 'expiring', 'expired'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, expiryFilter === status && styles.filterChipActive]}
                  onPress={() => setExpiryFilter(status)}
                >
                  <Text style={[styles.filterChipText, expiryFilter === status && styles.filterChipTextActive]}>
                    {status === 'all' ? 'All' : status === 'expiring' ? 'Expiring Soon' : 'Expired'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.filterChips}>
              {[
                { key: 'expiry', label: 'Expiry Date' },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, sortBy === option.key && styles.filterChipActive]}
                  onPress={() => setSortBy(option.key as 'expiry' | 'name' | 'category')}
                >
                  <Text style={[styles.filterChipText, sortBy === option.key && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.sage} />
          <Text style={styles.loadingText}>Loading your inventory...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="basket-outline" size={64} color={colors.primary.sageLight} />
          </View>
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptySubtext}>
            Start by adding food items to track their freshness and reduce waste
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddItem}>
            <Ionicons name="add" size={20} color={colors.text.inverse} />
            <Text style={styles.emptyButtonText}>Add Your First Item</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAndSortedItems.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={48} color={colors.text.muted} />
          <Text style={styles.noResultsTitle}>No items found</Text>
          <Text style={styles.noResultsSubtext}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.mergedIds.join('-')}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.sage}
              colors={[colors.primary.sage]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddItem}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.text.inverse} />
        </TouchableOpacity>
      </Animated.View>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
            {selectedItem && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.actionSheetHeader}>
                  <View style={[
                    styles.actionItemIcon,
                    { backgroundColor: getCategoryColor(selectedItem.category) + '15' }
                  ]}>
                    <Ionicons
                      name={getCategoryIcon(selectedItem.category) as any}
                      size={24}
                      color={getCategoryColor(selectedItem.category)}
                    />
                  </View>
                  <View style={styles.actionItemInfo}>
                    <Text style={styles.actionSheetTitle}>{selectedItem.name}</Text>
                    <Text style={styles.actionSheetSubtitle}>
                      {selectedItem.quantity} {selectedItem.unit} • {selectedItem.category}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                    <View style={[styles.actionButtonIcon, { backgroundColor: colors.status.infoBg }]}>
                      <Ionicons name="pencil" size={20} color={colors.status.info} />
                    </View>
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonText}>Edit Item</Text>
                      <Text style={styles.actionButtonHint}>Update details or expiry date</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={handleConsume}>
                    <View style={[styles.actionButtonIcon, { backgroundColor: colors.status.successBg }]}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
                    </View>
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonText}>Mark as Consumed</Text>
                      <Text style={styles.actionButtonHint}>Track what you've used</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                    <View style={[styles.actionButtonIcon, { backgroundColor: colors.status.errorBg }]}>
                      <Ionicons name="trash" size={20} color={colors.status.error} />
                    </View>
                    <View style={styles.actionButtonContent}>
                      <Text style={[styles.actionButtonText, { color: colors.status.error }]}>Delete</Text>
                      <Text style={styles.actionButtonHint}>Remove from inventory</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowActionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={styles.editModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.editModalTitle}>Edit Item</Text>
                <TouchableOpacity onPress={handleSaveEdit} disabled={actionLoading}>
                  <Text style={[styles.editModalSave, actionLoading && styles.editModalSaveDisabled]}>
                    {actionLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.editLabel}>NAME</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Product name"
                placeholderTextColor={colors.text.muted}
              />

              <Text style={styles.editLabel}>CATEGORY</Text>
              <TouchableOpacity
                style={styles.editCategoryButton}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.editCategoryText}>
                  {editForm.category || 'Select category'}
                </Text>
                <Ionicons
                  name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.categoryOptions}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        editForm.category.toLowerCase() === cat.toLowerCase() &&
                          styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        setEditForm({ ...editForm, category: cat });
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          editForm.category.toLowerCase() === cat.toLowerCase() &&
                            styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.editLabel}>QUANTITY</Text>
              <TextInput
                style={styles.quantityInputSimple}
                value={String(editForm.quantity)}
                onChangeText={(text) => {
                  const num = parseFloat(text) || 0;
                  setEditForm({ ...editForm, quantity: num });
                }}
                keyboardType="numeric"
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Enter quantity"
                placeholderTextColor={colors.text.muted}
              />

              <Text style={styles.editLabel}>UNIT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitChip,
                      editForm.unit.toLowerCase() === u.toLowerCase() && styles.unitChipSelected,
                    ]}
                    onPress={() => setEditForm({ ...editForm, unit: u })}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        editForm.unit.toLowerCase() === u.toLowerCase() && styles.unitChipTextSelected,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.editLabel}>EXPIRY DATE</Text>
              <Calendar
                onDayPress={(day: { dateString: string }) =>
                  setEditForm({ ...editForm, expiryDate: day.dateString })
                }
                markedDates={{
                  [editForm.expiryDate]: { selected: true, selectedColor: colors.primary.sage },
                }}
                theme={{
                  backgroundColor: colors.background.card,
                  calendarBackground: colors.background.card,
                  todayTextColor: colors.primary.sage,
                  arrowColor: colors.primary.sage,
                  selectedDayBackgroundColor: colors.primary.sage,
                  selectedDayTextColor: colors.text.inverse,
                  dayTextColor: colors.text.primary,
                  textDisabledColor: colors.text.muted,
                  monthTextColor: colors.text.primary,
                  textMonthFontWeight: '600',
                }}
                style={styles.calendar}
              />

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Consume Modal */}
      <Modal
        visible={showConsumeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConsumeModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.consumeModalOverlay}>
            <View style={styles.consumeModalContent}>
            <View style={styles.consumeModalHeader}>
              <View style={[styles.consumeIcon, { backgroundColor: colors.status.successBg }]}>
                <Ionicons name="checkmark-circle" size={32} color={colors.status.success} />
              </View>
              <Text style={styles.consumeModalTitle}>Mark as Consumed</Text>
              {selectedItem && (
                <Text style={styles.consumeModalSubtitle}>
                  {selectedItem.name} • {selectedItem.quantity} {selectedItem.unit} available
                </Text>
              )}
            </View>

            <View style={styles.consumeModalBody}>
              <Text style={styles.consumeLabel}>How many did you use?</Text>

              <View style={styles.consumeInputRow}>
                <TextInput
                  style={styles.consumeQuantityInputSimple}
                  value={String(consumeQuantity)}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    const maxQty = selectedItem?.quantity || 1;
                    setConsumeQuantity(Math.min(num, maxQty));
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
                <Text style={styles.consumeUnitLabel}>{selectedItem?.unit}</Text>
              </View>

              {selectedItem && consumeQuantity >= selectedItem.quantity && (
                <View style={styles.consumeWarningBox}>
                  <Ionicons name="information-circle" size={18} color={colors.status.warning} />
                  <Text style={styles.consumeWarning}>
                    This will remove the item from your inventory
                  </Text>
                </View>
              )}

              {selectedItem && consumeQuantity < selectedItem.quantity && (
                <View style={styles.consumeInfoBox}>
                  <Ionicons name="information-circle" size={18} color={colors.primary.sage} />
                  <Text style={styles.consumeInfo}>
                    {selectedItem.quantity - consumeQuantity} {selectedItem.unit} will remain
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.consumeModalButtons}>
              <TouchableOpacity
                style={styles.consumeCancelButton}
                onPress={() => {
                  setShowConsumeModal(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.consumeCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.consumeConfirmButton, actionLoading && styles.buttonDisabled]}
                onPress={confirmConsume}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
                    <Text style={styles.consumeConfirmText}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.base,
    backgroundColor: colors.background.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerGreeting: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },

  // Status Pills
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // Loading & Empty states
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.sage,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    gap: spacing.sm,
    ...shadows.base,
  },
  emptyButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  // List
  list: {
    padding: spacing.base,
    paddingBottom: 120,
  },

  // Item Card
  itemCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    ...shadows.base,
  },
  itemCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  itemCardPressed: {
    opacity: 0.7,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  expiryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expiryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  quantityBadge: {
    alignItems: 'flex-end',
    marginRight: spacing.xs,
  },
  quantityText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  unitText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textTransform: 'lowercase',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primary.sage,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },

  // Action Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.base,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    paddingTop: 0,
    gap: spacing.md,
  },
  actionItemIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemInfo: {
    flex: 1,
  },
  actionSheetTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  actionSheetSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actionButtons: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    gap: spacing.md,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  actionButtonHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  cancelButton: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  // Edit Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '92%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  editModalCancel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  editModalTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  editModalSave: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.primary.sage,
    fontWeight: typography.weight.semibold,
  },
  editModalSaveDisabled: {
    opacity: 0.5,
  },
  editModalBody: {
    padding: spacing.base,
  },
  editLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  editInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    padding: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  editCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    padding: spacing.md,
  },
  editCategoryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary.sage,
  },
  categoryOptionText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  categoryOptionTextSelected: {
    color: colors.text.inverse,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  quantityButtonMinus: {
    width: 52,
    height: 52,
    borderRadius: radius.base,
    backgroundColor: colors.status.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonPlus: {
    width: 52,
    height: 52,
    borderRadius: radius.base,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    minWidth: 80,
    alignItems: 'center',
  },
  quantityValue: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  quantityInput: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    minWidth: 100,
    textAlign: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quantityInputSimple: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    textAlign: 'center',
  },
  unitChips: {
    marginTop: spacing.xs,
  },
  unitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
  },
  unitChipSelected: {
    backgroundColor: colors.primary.sage,
  },
  unitChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  unitChipTextSelected: {
    color: colors.text.inverse,
  },
  calendar: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  // Consume Modal
  consumeModalOverlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  consumeModalContent: {
    backgroundColor: colors.background.card,
    borderRadius: radius['2xl'],
    width: '100%',
    maxWidth: 360,
    ...shadows.xl,
  },
  consumeModalHeader: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  consumeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  consumeModalTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  consumeModalSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  consumeModalBody: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  consumeLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  consumeQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  consumeQuantityButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumeQuantityDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  consumeQuantityValue: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['5xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  consumeQuantityInput: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['5xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    minWidth: 120,
    textAlign: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  consumeQuantityUnit: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  consumeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  consumeQuantityInputSimple: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 120,
    textAlign: 'center',
  },
  consumeUnitLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  consumeWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warningBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  consumeWarning: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.status.warning,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  consumeInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.sageMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  consumeInfo: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.primary.sage,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  consumeModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: 0,
  },
  consumeCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  consumeCancelText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  consumeConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.primary.sage,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  consumeConfirmText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.base,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.sage,
  },

  // Filter Panel
  filterPanel: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  filterRow: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary.sage,
  },
  filterChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },

  // No Results
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noResultsTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.sage,
    borderRadius: radius.base,
  },
  clearFiltersText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
