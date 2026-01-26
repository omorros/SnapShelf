import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows, typography } from '../../theme';
import { CATEGORIES } from '../../types';

interface InventoryFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    selectedCategory: string | null;
    onCategoryChange: (category: string | null) => void;
    expiryFilter: 'all' | 'expiring' | 'expired';
    onExpiryFilterChange: (filter: 'all' | 'expiring' | 'expired') => void;
    sortBy: 'expiry' | 'name' | 'category';
    onSortChange: (sort: 'expiry' | 'name' | 'category') => void;
}

export function InventoryFilters({
    searchQuery,
    onSearchChange,
    showFilters,
    onToggleFilters,
    selectedCategory,
    onCategoryChange,
    expiryFilter,
    onExpiryFilterChange,
    sortBy,
    onSortChange,
}: InventoryFiltersProps) {
    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={18} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={onSearchChange}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => onSearchChange('')}>
                            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                    onPress={onToggleFilters}
                >
                    <Ionicons
                        name="options-outline"
                        size={20}
                        color={showFilters ? colors.text.inverse : colors.primary.sage}
                    />
                </TouchableOpacity>
            </View>

            {/* Expanded Filters */}
            {showFilters && (
                <View style={styles.filterPanel}>
                    {/* Category Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                                onPress={() => onCategoryChange(null)}
                            >
                                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                                    onPress={() => onCategoryChange(selectedCategory === cat ? null : cat)}
                                >
                                    <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Status Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Status</Text>
                        <View style={styles.filterChipsRow}>
                            {(['all', 'expiring', 'expired'] as const).map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.filterChip, expiryFilter === status && styles.filterChipActive]}
                                    onPress={() => onExpiryFilterChange(status)}
                                >
                                    <Text style={[styles.filterChipText, expiryFilter === status && styles.filterChipTextActive]}>
                                        {status === 'all' ? 'All' : status === 'expiring' ? 'Expiring Soon' : 'Expired'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Sort Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Sort by</Text>
                        <View style={styles.filterChipsRow}>
                            {[
                                { key: 'expiry', label: 'Expiry Date' },
                                { key: 'name', label: 'Name' },
                                { key: 'category', label: 'Category' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[styles.filterChip, sortBy === option.key && styles.filterChipActive]}
                                    onPress={() => onSortChange(option.key as any)}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.base,
    },
    searchRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xs,
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
    filterPanel: {
        backgroundColor: colors.background.card,
        borderRadius: radius.lg,
        padding: spacing.base,
        marginTop: spacing.sm,
        ...shadows.sm,
    },
    filterGroup: {
        marginBottom: spacing.md,
    },
    filterLabel: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    filterChipsRow: {
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
});
