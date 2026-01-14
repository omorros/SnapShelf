import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../services/api';
import { DraftItem, InventoryItemCreate, BarcodeLookupResult, CATEGORIES, UNITS } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types for detected items
interface DetectedItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  confirmed: boolean;
}

// Screen modes
type ScreenMode = 'options' | 'scanning' | 'detected' | 'manual' | 'barcode';

export default function AddItemScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  // Screen state
  const [mode, setMode] = useState<ScreenMode>('options');
  const [loading, setLoading] = useState(false);

  // Barcode scanner state
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  // Detected items state
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<DetectedItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    name: '',
    category: 'Other',
    quantity: 1,
    unit: 'Pieces',
    expiryDate: '',
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Convert DraftItem to DetectedItem
  const draftToDetected = (draft: DraftItem): DetectedItem => ({
    id: draft.id,
    name: draft.name,
    category: draft.category || 'Other',
    quantity: draft.quantity || 1,
    unit: draft.unit || 'Pieces',
    expiryDate: draft.expiration_date || '',
    confirmed: false,
  });

  // Handle image scan
  const handleScanImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access');
      return;
    }

    Alert.alert('Add Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled) processImage(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!result.canceled) processImage(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const processImage = async (uri: string) => {
    setMode('scanning');
    setLoading(true);
    try {
      const drafts = await api.ingestImage(uri, 'fridge');
      if (drafts.length === 0) {
        Alert.alert('No items detected', 'Try taking a clearer photo');
        setMode('options');
      } else {
        setDetectedItems(drafts.map(draftToDetected));
        setMode('detected');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image');
      setMode('options');
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scan - open camera scanner
  const handleScanBarcode = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to scan barcodes');
        return;
      }
    }
    // Reset barcode state
    setScannedBarcode(null);
    setBarcodeResult(null);
    setBarcodeLoading(false);
    lastScannedRef.current = null;
    setMode('barcode');
  };

  // Handle barcode detected by camera
  const handleBarcodeScanned = async (data: string) => {
    // Prevent duplicate scans
    if (lastScannedRef.current === data || barcodeLoading) return;
    lastScannedRef.current = data;

    setScannedBarcode(data);
    setBarcodeLoading(true);

    try {
      const result = await api.lookupBarcode(data);
      setBarcodeResult(result);
    } catch (error: any) {
      Alert.alert('Lookup Failed', error.message || 'Could not look up barcode');
      setBarcodeResult(null);
    } finally {
      setBarcodeLoading(false);
    }
  };

  // Use the scanned barcode result
  const useBarcodeResult = () => {
    if (!barcodeResult) return;

    // Convert to detected item format
    const detectedItem: DetectedItem = {
      id: `barcode-${barcodeResult.barcode}`,
      name: barcodeResult.name,
      category: barcodeResult.category || 'Other',
      quantity: 1,
      unit: 'Pieces',
      expiryDate: barcodeResult.predicted_expiry || '',
      confirmed: false,
    };

    setDetectedItems([detectedItem]);
    setMode('detected');
  };

  // Scan another barcode
  const scanAnotherBarcode = () => {
    setScannedBarcode(null);
    setBarcodeResult(null);
    lastScannedRef.current = null;
  };

  // Handle manual entry
  const handleManualEntry = () => {
    setMode('manual');
  };

  // Confirm single detected item
  const confirmItem = async (item: DetectedItem) => {
    if (!item.expiryDate) {
      Alert.alert('Missing Date', 'Please set an expiry date before confirming');
      setEditingItem(item);
      setShowEditModal(true);
      return;
    }

    setLoading(true);
    try {
      const inventoryData: InventoryItemCreate = {
        name: item.name,
        category: item.category.toLowerCase(),
        quantity: item.quantity,
        unit: item.unit.toLowerCase(),
        storage_location: 'fridge',
        expiry_date: item.expiryDate,
      };

      await api.addToInventory(inventoryData);

      // Mark as confirmed and remove from list
      setDetectedItems((prev) => prev.filter((i) => i.id !== item.id));

      // If no more items, show success and go back
      if (detectedItems.length === 1) {
        Alert.alert('Success', 'Item added to inventory!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  // Skip item
  const skipItem = (item: DetectedItem) => {
    setDetectedItems((prev) => prev.filter((i) => i.id !== item.id));
    if (detectedItems.length === 1) {
      router.back();
    }
  };

  // Save edited item
  const saveEditedItem = () => {
    if (!editingItem) return;
    setDetectedItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? editingItem : i))
    );
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Save manual entry
  const saveManualEntry = async () => {
    if (!manualForm.name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (!manualForm.expiryDate) {
      Alert.alert('Error', 'Please select an expiry date');
      return;
    }

    setLoading(true);
    try {
      const inventoryData: InventoryItemCreate = {
        name: manualForm.name.trim(),
        category: manualForm.category.toLowerCase(),
        quantity: manualForm.quantity,
        unit: manualForm.unit.toLowerCase(),
        storage_location: 'fridge',
        expiry_date: manualForm.expiryDate,
      };

      await api.addToInventory(inventoryData);

      Alert.alert('Success', 'Item added to inventory!', [
        { text: 'Add More', onPress: resetManualForm },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const resetManualForm = () => {
    setManualForm({
      name: '',
      category: 'Other',
      quantity: 1,
      unit: 'Pieces',
      expiryDate: '',
    });
  };

  // Done with detected items
  const handleDone = () => {
    router.back();
  };

  // Go back to options
  const handleBack = () => {
    if (mode === 'manual' || mode === 'detected' || mode === 'barcode') {
      setMode('options');
      setDetectedItems([]);
      resetManualForm();
      setScannedBarcode(null);
      setBarcodeResult(null);
      lastScannedRef.current = null;
    } else {
      router.back();
    }
  };

  // Render options view
  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionsTitle}>Add Food</Text>
      <Text style={styles.optionsSubtitle}>Choose how to add items</Text>

      <TouchableOpacity style={styles.optionButton} onPress={handleScanImage}>
        <View style={[styles.optionIcon, { backgroundColor: '#e8f5e9' }]}>
          <Ionicons name="camera" size={32} color="#2e7d32" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Scan from Image</Text>
          <Text style={styles.optionDescription}>Take a photo and detect items automatically</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={handleScanBarcode}>
        <View style={[styles.optionIcon, { backgroundColor: '#e3f2fd' }]}>
          <Ionicons name="barcode" size={32} color="#1976d2" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Scan Barcode</Text>
          <Text style={styles.optionDescription}>Scan product barcode for quick entry</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={handleManualEntry}>
        <View style={[styles.optionIcon, { backgroundColor: '#fff3e0' }]}>
          <Ionicons name="create" size={32} color="#f57c00" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add Manually</Text>
          <Text style={styles.optionDescription}>Enter item details yourself</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>
    </View>
  );

  // Render scanning/loading view
  const renderScanning = () => (
    <View style={styles.scanningContainer}>
      <ActivityIndicator size="large" color="#2e7d32" />
      <Text style={styles.scanningText}>Detecting items...</Text>
    </View>
  );

  // Render barcode scanner view
  const renderBarcodeScanner = () => (
    <View style={styles.barcodeScannerContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93'],
        }}
        onBarcodeScanned={(result) => handleBarcodeScanned(result.data)}
      >
        {/* Scanning overlay */}
        <View style={styles.scannerOverlay}>
          {/* Top dark area */}
          <View style={styles.overlayTop} />

          {/* Middle row with scanning frame */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {/* Barcode icon in center */}
              {!scannedBarcode && (
                <Ionicons name="barcode-outline" size={48} color="rgba(255,255,255,0.5)" />
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom dark area */}
          <View style={styles.overlayBottom} />
        </View>
      </CameraView>

      {/* Bottom panel */}
      <View style={styles.barcodePanel}>
        {!scannedBarcode ? (
          <>
            <Text style={styles.barcodePanelTitle}>Scanning barcode...</Text>
            <Text style={styles.barcodePanelSubtitle}>Place barcode in frame</Text>
          </>
        ) : barcodeLoading ? (
          <>
            <ActivityIndicator size="small" color="#2e7d32" />
            <Text style={styles.barcodePanelTitle}>Loading from Open Food Facts...</Text>
            <Text style={styles.barcodePanelSubtitle}>Barcode: {scannedBarcode}</Text>
          </>
        ) : barcodeResult ? (
          <>
            <Text style={styles.barcodePanelTitle} numberOfLines={2}>
              {barcodeResult.name}
            </Text>
            {barcodeResult.brand && (
              <Text style={styles.barcodePanelBrand}>{barcodeResult.brand}</Text>
            )}
            <Text style={styles.barcodePanelSubtitle}>Barcode: {scannedBarcode}</Text>
            {!barcodeResult.found_in_database && (
              <Text style={styles.barcodePanelWarning}>Not found in database - you can edit details</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.barcodePanelTitle}>Barcode: {scannedBarcode}</Text>
            <Text style={styles.barcodePanelWarning}>Could not look up product</Text>
          </>
        )}

        {/* Action buttons */}
        <View style={styles.barcodePanelButtons}>
          <TouchableOpacity style={styles.barcodeCancelButton} onPress={handleBack}>
            <Text style={styles.barcodeCancelText}>Cancel</Text>
          </TouchableOpacity>

          {scannedBarcode && !barcodeLoading && (
            <TouchableOpacity style={styles.barcodeScanButton} onPress={scanAnotherBarcode}>
              <Text style={styles.barcodeScanText}>Scan</Text>
            </TouchableOpacity>
          )}

          {barcodeResult && (
            <TouchableOpacity style={styles.barcodeUseButton} onPress={useBarcodeResult}>
              <Text style={styles.barcodeUseText}>Use</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Render detected items view
  const renderDetectedItems = () => (
    <ScrollView style={styles.detectedContainer}>
      <Text style={styles.detectedTitle}>Detected Items</Text>
      <Text style={styles.detectedSubtitle}>
        Review and confirm each item to add to inventory
      </Text>

      {detectedItems.map((item) => (
        <View key={item.id} style={styles.detectedCard}>
          <View style={styles.detectedHeader}>
            <Text style={styles.detectedName}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingItem(item);
                setShowEditModal(true);
              }}
            >
              <Ionicons name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.detectedInfo}>
            <Text style={styles.detectedInfoText}>
              {item.quantity} {item.unit} • {item.category}
            </Text>
            {item.expiryDate ? (
              <Text style={styles.detectedExpiry}>Expires: {item.expiryDate}</Text>
            ) : (
              <Text style={styles.detectedExpiryMissing}>No expiry date set</Text>
            )}
          </View>

          <View style={styles.detectedActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => skipItem(item)}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={() => confirmItem(item)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {detectedItems.length === 0 && (
        <View style={styles.emptyDetected}>
          <Ionicons name="checkmark-circle" size={64} color="#2e7d32" />
          <Text style={styles.emptyDetectedText}>All items processed!</Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render manual entry form
  const renderManualForm = () => (
    <ScrollView style={styles.manualContainer}>
      <Text style={styles.sectionLabel}>PRODUCT NAME</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter product name"
          placeholderTextColor="#999"
          value={manualForm.name}
          onChangeText={(text) => setManualForm({ ...manualForm, name: text })}
        />
      </View>

      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.categoryRow}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Text style={styles.categoryLabel}>Category</Text>
          <View style={styles.categoryValue}>
            <Text style={styles.categoryText}>{manualForm.category}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={styles.categoryOptions}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  manualForm.category === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  setManualForm({ ...manualForm, category: cat });
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    manualForm.category === cat && styles.categoryOptionTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.sectionLabel}>QUANTITY</Text>
      <View style={styles.card}>
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setManualForm({ ...manualForm, quantity: Math.max(1, manualForm.quantity - 1) })
              }
            >
              <Ionicons name="remove" size={24} color="#d32f2f" />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{manualForm.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setManualForm({ ...manualForm, quantity: manualForm.quantity + 1 })
              }
            >
              <Ionicons name="add" size={24} color="#2e7d32" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChip, manualForm.unit === u && styles.unitChipSelected]}
              onPress={() => setManualForm({ ...manualForm, unit: u })}
            >
              <Text style={[styles.unitChipText, manualForm.unit === u && styles.unitChipTextSelected]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.sectionLabel}>EXPIRY DATE</Text>
      <View style={styles.card}>
        <Calendar
          onDayPress={(day: { dateString: string }) =>
            setManualForm({ ...manualForm, expiryDate: day.dateString })
          }
          markedDates={{
            [manualForm.expiryDate]: { selected: true, selectedColor: '#2e7d32' },
          }}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{
            todayTextColor: '#2e7d32',
            arrowColor: '#2e7d32',
            selectedDayBackgroundColor: '#2e7d32',
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.buttonDisabled]}
        onPress={saveManualEntry}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Add to Inventory</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // Edit modal
  const renderEditModal = () => (
    <Modal visible={showEditModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={saveEditedItem}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionLabel}>NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={editingItem?.name || ''}
              onChangeText={(text) =>
                setEditingItem((prev) => (prev ? { ...prev, name: text } : null))
              }
            />

            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null
                  )
                }
              >
                <Ionicons name="remove" size={24} color="#d32f2f" />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{editingItem?.quantity || 1}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, quantity: prev.quantity + 1 } : null
                  )
                }
              >
                <Ionicons name="add" size={24} color="#2e7d32" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>UNIT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitChip,
                    editingItem?.unit === u && styles.unitChipSelected,
                  ]}
                  onPress={() =>
                    setEditingItem((prev) => (prev ? { ...prev, unit: u } : null))
                  }
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      editingItem?.unit === u && styles.unitChipTextSelected,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>EXPIRY DATE</Text>
            <Calendar
              onDayPress={(day: { dateString: string }) =>
                setEditingItem((prev) =>
                  prev ? { ...prev, expiryDate: day.dateString } : null
                )
              }
              markedDates={{
                [editingItem?.expiryDate || '']: { selected: true, selectedColor: '#2e7d32' },
              }}
              minDate={new Date().toISOString().split('T')[0]}
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
  );

  // For barcode mode, render without the normal header
  if (mode === 'barcode') {
    return (
      <View style={styles.container}>
        {renderBarcodeScanner()}
        {renderEditModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'options' && 'Add Food'}
          {mode === 'scanning' && 'Processing...'}
          {mode === 'detected' && 'Review Items'}
          {mode === 'manual' && 'Add Manually'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Content */}
      {mode === 'options' && renderOptions()}
      {mode === 'scanning' && renderScanning()}
      {mode === 'detected' && renderDetectedItems()}
      {mode === 'manual' && renderManualForm()}

      {/* Edit Modal */}
      {renderEditModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  // Options View
  optionsContainer: {
    flex: 1,
    padding: 24,
  },
  optionsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionsSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Scanning View
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },

  // Detected Items View
  detectedContainer: {
    flex: 1,
    padding: 16,
  },
  detectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detectedSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  detectedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectedName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detectedInfo: {
    marginBottom: 12,
  },
  detectedInfoText: {
    fontSize: 14,
    color: '#666',
  },
  detectedExpiry: {
    fontSize: 14,
    color: '#2e7d32',
    marginTop: 4,
  },
  detectedExpiryMissing: {
    fontSize: 14,
    color: '#f57c00',
    marginTop: 4,
  },
  detectedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyDetected: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyDetectedText: {
    fontSize: 18,
    color: '#2e7d32',
    marginTop: 16,
  },
  doneButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  doneButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },

  // Manual Form
  manualContainer: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLabel: {
    fontSize: 16,
    color: '#333',
  },
  categoryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 16,
    color: '#2e7d32',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    paddingTop: 0,
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
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  unitChips: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  saveButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSave: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },

  // Barcode Scanner Styles
  barcodeScannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.45,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  barcodePanel: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  barcodePanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  barcodePanelBrand: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  barcodePanelSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  barcodePanelWarning: {
    fontSize: 13,
    color: '#f57c00',
    marginBottom: 8,
  },
  barcodePanelButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  barcodeCancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#d32f2f',
  },
  barcodeCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  barcodeScanButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
  },
  barcodeScanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  barcodeUseButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1976d2',
  },
  barcodeUseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
