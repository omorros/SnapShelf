import { useState, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { InventoryItem, CATEGORIES, UNITS } from '../../types';
import { useAuth } from '../../services/auth';

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

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

  // Open action modal when item is tapped
  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowActionModal(true);
  };

  // Open edit modal
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

  // Save edited item
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

  // Open consume modal
  const handleConsume = () => {
    if (!selectedItem) return;
    setConsumeQuantity(1);
    setShowActionModal(false);
    setShowConsumeModal(true);
  };

  // Perform the consumption
  const confirmConsume = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const remaining = selectedItem.quantity - consumeQuantity;

      if (remaining <= 0) {
        // Consumed all - delete the item
        await api.deleteInventoryItem(selectedItem.id);
        setItems(items.filter((i) => i.id !== selectedItem.id));
      } else {
        // Partial consumption - update quantity
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

  // Delete item (threw away / mistake)
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
        onPress={() => handleItemPress(item)}
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
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
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

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionSheet}>
            {selectedItem && (
              <>
                <View style={styles.actionSheetHeader}>
                  <Text style={styles.actionSheetTitle}>{selectedItem.name}</Text>
                  <Text style={styles.actionSheetSubtitle}>
                    {selectedItem.quantity} {selectedItem.unit}
                  </Text>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                  <Ionicons name="pencil" size={24} color="#1976d2" />
                  <Text style={styles.actionButtonText}>Edit Item</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleConsume}>
                  <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
                  <Text style={styles.actionButtonText}>Mark as Consumed</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleDelete}>
                  <Ionicons name="trash" size={24} color="#d32f2f" />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowActionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
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

            <ScrollView style={styles.editModalBody}>
              <Text style={styles.editLabel}>NAME</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Product name"
              />

              <Text style={styles.editLabel}>CATEGORY</Text>
              <TouchableOpacity
                style={styles.editCategoryButton}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.editCategoryText}>{editForm.category || 'Select category'}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.categoryOptions}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        editForm.category.toLowerCase() === cat.toLowerCase() && styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        setEditForm({ ...editForm, category: cat });
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          editForm.category.toLowerCase() === cat.toLowerCase() && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.editLabel}>QUANTITY</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setEditForm({ ...editForm, quantity: Math.max(1, editForm.quantity - 1) })}
                >
                  <Ionicons name="remove" size={24} color="#d32f2f" />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{editForm.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setEditForm({ ...editForm, quantity: editForm.quantity + 1 })}
                >
                  <Ionicons name="add" size={24} color="#2e7d32" />
                </TouchableOpacity>
              </View>

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
                  [editForm.expiryDate]: { selected: true, selectedColor: '#2e7d32' },
                }}
                theme={{
                  todayTextColor: '#2e7d32',
                  arrowColor: '#2e7d32',
                  selectedDayBackgroundColor: '#2e7d32',
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Consume Modal */}
      <Modal
        visible={showConsumeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConsumeModal(false)}
      >
        <View style={styles.consumeModalOverlay}>
          <View style={styles.consumeModalContent}>
            <View style={styles.consumeModalHeader}>
              <Text style={styles.consumeModalTitle}>Mark as Consumed</Text>
              {selectedItem && (
                <Text style={styles.consumeModalSubtitle}>
                  {selectedItem.name} ({selectedItem.quantity} {selectedItem.unit} available)
                </Text>
              )}
            </View>

            <View style={styles.consumeModalBody}>
              <Text style={styles.consumeLabel}>How many did you consume?</Text>

              <View style={styles.consumeQuantityRow}>
                <TouchableOpacity
                  style={styles.consumeQuantityButton}
                  onPress={() => setConsumeQuantity(Math.max(1, consumeQuantity - 1))}
                >
                  <Ionicons name="remove" size={28} color="#d32f2f" />
                </TouchableOpacity>

                <View style={styles.consumeQuantityDisplay}>
                  <Text style={styles.consumeQuantityValue}>{consumeQuantity}</Text>
                  <Text style={styles.consumeQuantityUnit}>{selectedItem?.unit}</Text>
                </View>

                <TouchableOpacity
                  style={styles.consumeQuantityButton}
                  onPress={() =>
                    setConsumeQuantity(Math.min(selectedItem?.quantity || 1, consumeQuantity + 1))
                  }
                >
                  <Ionicons name="add" size={28} color="#2e7d32" />
                </TouchableOpacity>
              </View>

              {selectedItem && consumeQuantity >= selectedItem.quantity && (
                <Text style={styles.consumeWarning}>
                  This will remove the item from your inventory
                </Text>
              )}

              {selectedItem && consumeQuantity < selectedItem.quantity && (
                <Text style={styles.consumeInfo}>
                  {selectedItem.quantity - consumeQuantity} {selectedItem.unit} will remain
                </Text>
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
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.consumeConfirmText}>
                  {actionLoading ? 'Saving...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Action Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  actionButtonText: {
    fontSize: 17,
    color: '#333',
  },
  actionButtonDanger: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButtonTextDanger: {
    color: '#d32f2f',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
  },

  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editModalSave: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  editModalSaveDisabled: {
    opacity: 0.5,
  },
  editModalBody: {
    padding: 16,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  editCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  editCategoryText: {
    fontSize: 16,
    color: '#333',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  categoryOptionSelected: {
    backgroundColor: '#2e7d32',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#666',
  },
  categoryOptionTextSelected: {
    color: '#fff',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    minWidth: 50,
    textAlign: 'center',
  },
  unitChips: {
    marginTop: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  unitChipSelected: {
    backgroundColor: '#2e7d32',
  },
  unitChipText: {
    fontSize: 14,
    color: '#666',
  },
  unitChipTextSelected: {
    color: '#fff',
  },

  // Consume Modal Styles
  consumeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  consumeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
  },
  consumeModalHeader: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  consumeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  consumeModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  consumeModalBody: {
    padding: 24,
    alignItems: 'center',
  },
  consumeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  consumeQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  consumeQuantityButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumeQuantityDisplay: {
    alignItems: 'center',
  },
  consumeQuantityValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#333',
  },
  consumeQuantityUnit: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  consumeWarning: {
    fontSize: 13,
    color: '#f57c00',
    marginTop: 16,
    textAlign: 'center',
  },
  consumeInfo: {
    fontSize: 13,
    color: '#2e7d32',
    marginTop: 16,
    textAlign: 'center',
  },
  consumeModalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  consumeCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  consumeCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  consumeConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  consumeConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
