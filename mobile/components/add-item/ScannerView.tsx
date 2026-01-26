import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { BarcodeLookupResult } from '../../types';

interface ScannerViewProps {
    scannedBarcode: string | null;
    barcodeLoading: boolean;
    barcodeResult: BarcodeLookupResult | null;
    onBarcodeScanned: (data: string) => void;
    onCancel: () => void;
    onScanAgain: () => void;
    onUseResult: () => void;
}

export function ScannerView({
    scannedBarcode,
    barcodeLoading,
    barcodeResult,
    onBarcodeScanned,
    onCancel,
    onScanAgain,
    onUseResult,
}: ScannerViewProps) {
    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93'],
                }}
                onBarcodeScanned={(result) => onBarcodeScanned(result.data)}
            >
                {/* Scanning overlay */}
                <View style={styles.scannerOverlay}>
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanFrame}>
                            {/* Corner brackets */}
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                            {!scannedBarcode && (
                                <Ionicons name="barcode-outline" size={48} color="rgba(255,255,255,0.5)" />
                            )}
                        </View>
                        <View style={styles.overlaySide} />
                    </View>
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
                            <Text style={styles.barcodePanelWarning}>
                                Not found in database - you can edit details
                            </Text>
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
                    <TouchableOpacity style={styles.barcodeCancelButton} onPress={onCancel}>
                        <Text style={styles.barcodeCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    {scannedBarcode && !barcodeLoading && (
                        <TouchableOpacity style={styles.barcodeScanButton} onPress={onScanAgain}>
                            <Text style={styles.barcodeScanText}>Scan</Text>
                        </TouchableOpacity>
                    )}

                    {barcodeResult && (
                        <TouchableOpacity style={styles.barcodeUseButton} onPress={onUseResult}>
                            <Text style={styles.barcodeUseText}>Use</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
        height: 280,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanFrame: {
        width: 280,
        height: 280,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: '#FFF',
        borderWidth: 3,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    barcodePanel: {
        backgroundColor: colors.background.card,
        padding: spacing.xl,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        alignItems: 'center',
    },
    barcodePanelTitle: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    barcodePanelBrand: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    barcodePanelSubtitle: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginBottom: spacing.md,
    },
    barcodePanelWarning: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        color: colors.status.warning,
        marginBottom: spacing.md,
    },
    barcodePanelButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: spacing.md,
    },
    barcodeCancelButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    barcodeCancelText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    barcodeScanButton: {
        backgroundColor: colors.background.secondary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.base,
    },
    barcodeScanText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    barcodeUseButton: {
        backgroundColor: colors.primary.sage,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.base,
    },
    barcodeUseText: {
        color: colors.text.inverse,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
});
