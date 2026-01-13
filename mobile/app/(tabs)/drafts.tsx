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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DraftItem, InventoryItemCreate } from '../../types';

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftItem | null>(null);
  const [confirmData, setConfirmData] = useState<InventoryItemCreate>({
    name: '',
    category: '',
    quantity: 1,
    unit: 'item',
    storage_location: 'fridge',
    expiry_date: '',
  });

  const fetchDrafts = async () => {
    try {
      const data = await api.getDraftItems();
      setDrafts(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch drafts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrafts();
  };

  const handleDelete = (draft: DraftItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${draft.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDraftItem(draft.id);
              setDrafts(drafts.filter((d) => d.id !== draft.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openConfirmModal = (draft: DraftItem) => {
    setSelectedDraft(draft);
    setConfirmData({
      name: draft.name,
      category: draft.category || 'other',
      quantity: draft.quantity || 1,
      unit: draft.unit || 'item',
      storage_location: draft.location || 'fridge',
      expiry_date: draft.expiration_date || new Date().toISOString().split('T')[0],
    });
  };

  const handleConfirm = async () => {
    if (!selectedDraft) return;

    try {
      await api.confirmDraftItem(selectedDraft.id, confirmData);
      setDrafts(drafts.filter((d) => d.id !== selectedDraft.id));
      setSelectedDraft(null);
      Alert.alert('Success', 'Item added to inventory!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderDraftItem = ({ item }: { item: DraftItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.confidence_score && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {Math.round(item.confidence_score * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardDetails}>
        {item.category && (
          <Text style={styles.detailText}>Category: {item.category}</Text>
        )}
        {item.expiration_date && (
          <Text style={styles.detailText}>Expires: {item.expiration_date}</Text>
        )}
        {item.source && (
          <Text style={styles.sourceText}>Source: {item.source}</Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#d32f2f" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => openConfirmModal(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {drafts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No pending items</Text>
          <Text style={styles.emptySubtext}>
            Scan some food to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraftItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Confirm Modal */}
      <Modal
        visible={!!selectedDraft}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDraft(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Item</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              value={confirmData.name}
              onChangeText={(text) =>
                setConfirmData({ ...confirmData, name: text })
              }
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Category"
              value={confirmData.category}
              onChangeText={(text) =>
                setConfirmData({ ...confirmData, category: text })
              }
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="Quantity"
                value={String(confirmData.quantity)}
                onChangeText={(text) =>
                  setConfirmData({ ...confirmData, quantity: parseFloat(text) || 1 })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { flex: 1, marginLeft: 8 }]}
                placeholder="Unit"
                value={confirmData.unit}
                onChangeText={(text) =>
                  setConfirmData({ ...confirmData, unit: text })
                }
              />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Expiry Date (YYYY-MM-DD)"
              value={confirmData.expiry_date}
              onChangeText={(text) =>
                setConfirmData({ ...confirmData, expiry_date: text })
              }
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSelectedDraft(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.modalConfirmText}>Add to Inventory</Text>
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  deleteText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalConfirmButton: {
    flex: 2,
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
