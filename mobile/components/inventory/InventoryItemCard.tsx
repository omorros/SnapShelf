import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { colors, radius, spacing, shadows, typography, getCategoryColor, getCategoryIcon, getExpiryColor } from '../../theme';
import { InventoryItem } from '../../types';
import { MergedInventoryItem } from '../../utils/inventoryMerge';

// Export for backward compatibility
export interface InventoryDisplayItem extends InventoryItem {
    mergedCount?: number;
    mergedIds?: string[];
}

interface InventoryItemCardProps {
    item: MergedInventoryItem;
    onPress: (item: MergedInventoryItem) => void;
    onEdit?: (item: MergedInventoryItem) => void;
    onDelete?: (item: MergedInventoryItem) => void;
    style?: ViewStyle;
}

export function InventoryItemCard({ item, onPress, onEdit, onDelete, style }: InventoryItemCardProps) {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const expiryInfo = getExpiryColor(daysUntilExpiry);
    const categoryColor = getCategoryColor(item.category);
    const categoryIconName = getCategoryIcon(item.category);

    // Swipe right to edit, swipe left to delete
    const renderLeftActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
        return (
            <RectButton style={[styles.swipeAction, styles.editAction]} onPress={() => onEdit?.(item)}>
                <Animated.View style={[styles.swipeContent, { transform: [{ scale }] }]}>
                    <Ionicons name="create-outline" size={22} color={colors.text.inverse} />
                    <Text style={styles.swipeText}>Edit</Text>
                </Animated.View>
            </RectButton>
        );
    };

    const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
        return (
            <RectButton style={[styles.swipeAction, styles.deleteAction]} onPress={() => onDelete?.(item)}>
                <Animated.View style={[styles.swipeContent, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={22} color={colors.text.inverse} />
                    <Text style={styles.swipeText}>Delete</Text>
                </Animated.View>
            </RectButton>
        );
    };

    return (
        <Swipeable
            renderLeftActions={onEdit ? renderLeftActions : undefined}
            renderRightActions={onDelete ? renderRightActions : undefined}
            containerStyle={style}
        >
            <Pressable
                onPress={() => onPress(item)}
                style={({ pressed }) => [
                    styles.container,
                    pressed && styles.pressed,
                ]}
            >
                {/* Category Icon */}
                <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '15' }]}>
                    <Ionicons name={categoryIconName as any} size={22} color={categoryColor} />
                </View>

                {/* Item Info */}
                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.expiryBadge, { backgroundColor: expiryInfo.background }]}>
                            <View style={[styles.expiryDot, { backgroundColor: expiryInfo.text }]} />
                            <Text style={[styles.expiryText, { color: expiryInfo.text }]}>
                                {expiryInfo.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quantity */}
                <View style={styles.quantityContainer}>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Text style={styles.unit}>{item.unit}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} style={{ marginLeft: spacing.sm }} />
            </Pressable>
        </Swipeable>
    );
}

// Helper
const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...shadows.base,
    },
    pressed: {
        opacity: 0.7,
    },
    swipeAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 88,
        borderRadius: radius.lg,
    },
    editAction: {
        backgroundColor: colors.primary.sage,
        marginRight: spacing.sm,
    },
    deleteAction: {
        backgroundColor: colors.status.error,
        marginLeft: spacing.sm,
    },
    swipeContent: {
        alignItems: 'center',
    },
    swipeText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xs,
        fontWeight: '600',
        color: colors.text.inverse,
        marginTop: 2,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    name: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expiryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
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
    quantityContainer: {
        alignItems: 'flex-end',
        marginLeft: spacing.md,
    },
    quantity: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    unit: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textTransform: 'lowercase',
    },
});
