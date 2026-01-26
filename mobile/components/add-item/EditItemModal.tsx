import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors, radius, spacing, shadows, typography } from '../../theme';
import { UNITS } from '../../types';
import { Input } from '../ui/Input';
import { DetectedItem } from './DetectedList';

interface EditItemModalProps {
    visible: boolean;
    item: DetectedItem | null;
    onClose: () => void;
    onSave: (item: DetectedItem) => void;
    onChange: (item: DetectedItem) => void;
}

export function EditItemModal({
    visible,
    item,
    onClose,
    onSave,
    onChange,
}: EditItemModalProps) {
    if (!item) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Item</Text>
                        <TouchableOpacity onPress={() => onSave(item)}>
                            <Text style={styles.modalSave}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <Input
                            label="NAME"
                            value={item.name}
                            onChangeText={(text) => onChange({ ...item, name: text })}
                            containerStyle={{ marginBottom: spacing.lg }}
                        />

                        <Input
                            label="QUANTITY"
                            value={String(item.quantity)}
                            onChangeText={(text) => {
                                const num = parseFloat(text) || 0;
                                onChange({ ...item, quantity: num });
                            }}
                            keyboardType="numeric"
                            containerStyle={{ marginBottom: spacing.md }}
                        />

                        <Text style={styles.sectionLabel}>UNIT</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: spacing.lg }}
                        >
                            {UNITS.map((u) => (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.unitChip, item.unit === u && styles.unitChipSelected]}
                                    onPress={() => onChange({ ...item, unit: u })}
                                >
                                    <Text
                                        style={[
                                            styles.unitChipText,
                                            item.unit === u && styles.unitChipTextSelected,
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
                                onChange({ ...item, expiryDate: day.dateString })
                            }
                            markedDates={{
                                [item.expiryDate || '']: {
                                    selected: true,
                                    selectedColor: colors.primary.sage,
                                },
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

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background.card,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        maxHeight: '90%',
        ...shadows.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.ui.border,
    },
    modalTitle: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    modalCancel: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    modalSave: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.primary.sage,
    },
    modalBody: {
        padding: spacing.base,
    },
    sectionLabel: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
        letterSpacing: 1,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    unitChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.background.secondary,
        marginRight: spacing.sm,
    },
    unitChipSelected: {
        backgroundColor: colors.primary.sage,
    },
    unitChipText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    unitChipTextSelected: {
        color: colors.text.inverse,
    },
});
