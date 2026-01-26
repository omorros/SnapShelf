import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { colors, radius, spacing, typography } from '../../theme';
import { CATEGORIES, UNITS } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ManualFormProps {
    onSave: (data: {
        name: string;
        category: string;
        quantity: number;
        unit: string;
        expiryDate: string;
    }) => void;
    loading: boolean;
    onCancel: () => void;
}

export function ManualForm({ onSave, loading, onCancel }: ManualFormProps) {
    const [form, setForm] = useState({
        name: '',
        category: 'Other',
        quantity: 100,
        unit: 'Grams',
        expiryDate: '',
    });
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const handleSave = () => {
        onSave(form);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.sectionLabel}>PRODUCT DETAILS</Text>

            <Card style={styles.card}>
                <Input
                    label="Product Name"
                    placeholder="e.g. Organic Bananas"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    containerStyle={{ marginBottom: spacing.lg }}
                />

                <Text style={[styles.label, { marginBottom: spacing.xs }]}>Category</Text>
                <TouchableOpacity
                    style={styles.categoryRow}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                    <Text style={styles.categoryText}>{form.category}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                {showCategoryPicker && (
                    <View style={styles.categoryOptions}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryOption,
                                    form.category === cat && styles.categoryOptionSelected,
                                ]}
                                onPress={() => {
                                    setForm({ ...form, category: cat });
                                    setShowCategoryPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.categoryOptionText,
                                        form.category === cat && styles.categoryOptionTextSelected,
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Card>

            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <Card style={styles.card}>
                <Input
                    value={String(form.quantity)}
                    onChangeText={(text) => {
                        const num = parseFloat(text) || 0;
                        setForm({ ...form, quantity: num });
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    containerStyle={{ marginBottom: spacing.md }}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
                    {UNITS.map((u) => (
                        <TouchableOpacity
                            key={u}
                            style={[styles.unitChip, form.unit === u && styles.unitChipSelected]}
                            onPress={() => setForm({ ...form, unit: u })}
                        >
                            <Text style={[styles.unitChipText, form.unit === u && styles.unitChipTextSelected]}>
                                {u}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Card>

            <Text style={styles.sectionLabel}>EXPIRY DATE</Text>
            <Card style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
                <Calendar
                    onDayPress={(day: { dateString: string }) =>
                        setForm({ ...form, expiryDate: day.dateString })
                    }
                    markedDates={{
                        [form.expiryDate]: { selected: true, selectedColor: colors.primary.sage },
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
            </Card>

            <View style={styles.actions}>
                <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={onCancel}
                    style={{ flex: 1 }}
                />
                <Button
                    label="Add to Inventory"
                    variant="primary"
                    onPress={handleSave}
                    loading={loading}
                    style={{ flex: 2 }}
                />
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
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
        marginTop: spacing.md,
    },
    card: {
        marginBottom: spacing.md,
    },
    label: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.base,
        backgroundColor: colors.background.secondary,
        borderRadius: radius.base,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    categoryText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    categoryOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    categoryOption: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.background.secondary,
    },
    categoryOptionSelected: {
        backgroundColor: colors.primary.sage,
    },
    categoryOptionText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    categoryOptionTextSelected: {
        color: colors.text.inverse,
        fontWeight: typography.weight.medium,
    },
    unitChips: {
        flexDirection: 'row',
        marginTop: spacing.xs,
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
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
});
