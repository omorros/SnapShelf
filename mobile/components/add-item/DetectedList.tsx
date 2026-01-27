import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

// Types for detected items (re-defined here or imported if move to shared types)
export interface DetectedItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    expiryDate: string;
    confirmed: boolean;
}

interface DetectedListProps {
    items: DetectedItem[];
    onEdit: (item: DetectedItem) => void;
    onConfirm: (item: DetectedItem) => void;
    onSkip: (item: DetectedItem) => void;
    onAddAll: () => void;
    onDiscard: () => void;
    loading: boolean;
}

export function DetectedList({
    items,
    onEdit,
    onConfirm,
    onSkip,
    onAddAll,
    onDiscard,
    loading,
}: DetectedListProps) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Detected Items</Text>
            <Text style={styles.subtitle}>
                Review and confirm each item to add to inventory
            </Text>

            {items.map((item) => (
                <Card key={item.id} style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{item.name}</Text>
                        <TouchableOpacity onPress={() => onEdit(item)}>
                            <Ionicons name="pencil" size={20} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.infoText}>
                            {item.quantity} {item.unit} • {item.category}
                        </Text>
                    </View>

                    {/* Prominent expiry date picker */}
                    <TouchableOpacity
                        style={[
                            styles.expiryRow,
                            item.expiryDate ? styles.expirySet : styles.expiryMissing,
                        ]}
                        onPress={() => onEdit(item)}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={item.expiryDate ? colors.status.warning : colors.status.error}
                        />
                        <View style={styles.expiryTextContainer}>
                            <Text
                                style={[
                                    styles.expiryLabel,
                                    !item.expiryDate && styles.expiryLabelMissing,
                                ]}
                            >
                                {item.expiryDate ? `Expires: ${item.expiryDate}` : 'No expiry date set'}
                            </Text>
                            <Text style={styles.expiryHint}>Tap to change</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                    </TouchableOpacity>

                    <View style={styles.actions}>
                        <Button
                            label="Skip"
                            variant="ghost"
                            size="sm"
                            onPress={() => onSkip(item)}
                            style={styles.skipButton}
                        />
                        <Button
                            label="Confirm"
                            variant="primary"
                            size="sm"
                            icon="checkmark"
                            onPress={() => onConfirm(item)}
                            loading={loading}
                            disabled={loading}
                        />
                        {/* 
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={() => onConfirm(item)}
              disabled={loading}
            >
               Old custom button logic replaced by Button component 
            </TouchableOpacity>
             */}
                    </View>
                </Card>
            ))}

            {items.length === 0 && (
                <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle" size={64} color={colors.primary.sage} />
                    <Text style={styles.emptyText}>All items processed!</Text>
                </View>
            )}

            {/* Bottom action buttons */}
            {items.length > 0 && (
                <View style={styles.bottomActions}>
                    <Button
                        label="Add All"
                        variant="primary"
                        icon="checkmark-done"
                        onPress={onAddAll}
                        loading={loading}
                        disabled={loading}
                        style={styles.addAllButton}
                    />
                    <Button
                        label="Discard All"
                        variant="ghost"
                        icon="trash-outline"
                        onPress={onDiscard}
                        disabled={loading}
                        style={styles.discardButton}
                    />
                </View>
            )}

            {items.length === 0 && (
                <Button
                    label="Done"
                    variant="primary"
                    onPress={onDiscard}
                    style={styles.doneButton}
                />
            )}

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
    title: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
    },
    card: {
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    name: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        flex: 1,
        marginRight: spacing.sm,
    },
    info: {
        marginBottom: spacing.md,
    },
    infoText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
    },
    expirySet: {
        backgroundColor: colors.status.warningBg,
        borderColor: colors.status.warning,
    },
    expiryMissing: {
        backgroundColor: colors.status.errorBg,
        borderColor: colors.status.error,
    },
    expiryTextContainer: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    expiryLabel: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    expiryLabelMissing: {
        color: colors.status.error,
        fontWeight: typography.weight.bold,
    },
    expiryHint: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.sm,
    },
    skipButton: {
        marginRight: spacing.xs,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: spacing.xl,
    },
    emptyText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    doneButton: {
        marginTop: spacing.xl,
    },
    bottomActions: {
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    addAllButton: {
        // Primary button - uses theme defaults
    },
    discardButton: {
        // Ghost button - subtle discard option
    },
});
