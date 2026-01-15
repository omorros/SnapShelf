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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../services/api';
import { DraftItem, InventoryItemCreate, BarcodeLookupResult, CATEGORIES, UNITS } from '../types';
import { colors, typography, spacing, radius, shadows } from '../theme';

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
        <View style={[styles.optionIcon, { backgroundColor: colors.primary.sageMuted }]}>
          <Ionicons name="camera" size={28} color={colors.primary.sage} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Scan from Image</Text>
          <Text style={styles.optionDescription}>Take a photo and detect items automatically</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={handleScanBarcode}>
        <View style={[styles.optionIcon, { backgroundColor: colors.status.infoBg }]}>
          <Ionicons name="barcode" size={28} color={colors.status.info} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Scan Barcode</Text>
          <Text style={styles.optionDescription}>Scan product barcode for quick entry</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={handleManualEntry}>
        <View style={[styles.optionIcon, { backgroundColor: colors.accent.terracottaMuted }]}>
          <Ionicons name="create" size={28} color={colors.accent.terracotta} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add Manually</Text>
          <Text style={styles.optionDescription}>Enter item details yourself</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );

  // Render scanning/loading view
  const renderScanning = () => (
    <View style={styles.scanningContainer}>
      <ActivityIndicator size="large" color={colors.primary.sage} />
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
            <ActivityIndicator size="small" color={colors.primary.sage} />
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
              <Ionicons name="pencil" size={20} color={colors.text.secondary} />
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
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {detectedItems.length === 0 && (
        <View style={styles.emptyDetected}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary.sage} />
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
          placeholderTextColor={colors.text.muted}
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
            <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
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
              <Ionicons name="remove" size={24} color={colors.status.error} />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{manualForm.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setManualForm({ ...manualForm, quantity: manualForm.quantity + 1 })
              }
            >
              <Ionicons name="add" size={24} color={colors.primary.sage} />
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
            [manualForm.expiryDate]: { selected: true, selectedColor: colors.primary.sage },
          }}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{
            todayTextColor: colors.primary.sage,
            arrowColor: colors.primary.sage,
            selectedDayBackgroundColor: colors.primary.sage,
            textDayFontFamily: typography.fontFamily.body,
            textMonthFontFamily: typography.fontFamily.body,
            textDayHeaderFontFamily: typography.fontFamily.body,
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.buttonDisabled]}
        onPress={saveManualEntry}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
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
                <Ionicons name="remove" size={24} color={colors.status.error} />
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
                <Ionicons name="add" size={24} color={colors.primary.sage} />
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
                [editingItem?.expiryDate || '']: { selected: true, selectedColor: colors.primary.sage },
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                todayTextColor: colors.primary.sage,
                arrowColor: colors.primary.sage,
                selectedDayBackgroundColor: colors.primary.sage,
                textDayFontFamily: typography.fontFamily.body,
                textMonthFontFamily: typography.fontFamily.body,
                textDayHeaderFontFamily: typography.fontFamily.body,
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
          <Ionicons name="close" size={28} color={colors.text.primary} />
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
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: 60,
    paddingBottom: spacing.base,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  // Options View
  optionsContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  optionsTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  optionsSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.base,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: spacing.base,
  },
  optionTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  optionDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Scanning View
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    marginTop: spacing.base,
  },

  // Detected Items View
  detectedContainer: {
    flex: 1,
    padding: spacing.base,
  },
  detectedTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  detectedSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  detectedCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.base,
  },
  detectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detectedName: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  detectedInfo: {
    marginBottom: spacing.md,
  },
  detectedInfoText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  detectedExpiry: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.primary.sage,
    marginTop: spacing.xs,
  },
  detectedExpiryMissing: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.status.warning,
    marginTop: spacing.xs,
  },
  detectedActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.ui.border,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.primary.sage,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyDetected: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyDetectedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.primary.sage,
    marginTop: spacing.base,
  },
  doneButton: {
    backgroundColor: colors.primary.sage,
    paddingVertical: spacing.base,
    borderRadius: radius.base,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.sm,
  },
  doneButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },

  // Manual Form
  manualContainer: {
    flex: 1,
    padding: spacing.base,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  input: {
    padding: spacing.base,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  categoryLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  categoryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.primary.sage,
    fontWeight: typography.weight.medium,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    paddingTop: 0,
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
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingBottom: spacing.sm,
  },
  quantityLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: radius.base,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    minWidth: 48,
    textAlign: 'center',
  },
  unitChips: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
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
  saveButton: {
    backgroundColor: colors.primary.sage,
    paddingVertical: spacing.base,
    borderRadius: radius.base,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.sm,
  },
  saveButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  modalCancel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modalSave: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.primary.sage,
    fontWeight: typography.weight.semibold,
  },
  modalBody: {
    padding: spacing.base,
  },
  modalInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    padding: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
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
    borderRadius: radius.lg,
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
    borderTopLeftRadius: radius.lg,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: radius.lg,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: radius.lg,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: radius.lg,
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  barcodePanel: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    alignItems: 'center',
  },
  barcodePanelTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  barcodePanelBrand: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  barcodePanelSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  barcodePanelWarning: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.status.warning,
    marginBottom: spacing.sm,
  },
  barcodePanelButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
  },
  barcodeCancelButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.status.error,
  },
  barcodeCancelText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  barcodeScanButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.primary.sage,
  },
  barcodeScanText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  barcodeUseButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.status.info,
  },
  barcodeUseText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
