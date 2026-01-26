import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface InventoryHeaderProps {
    statusCounts: {
        expired: number;
        expiringSoon: number;
        fresh: number;
        total: number;
    };
}

export function InventoryHeader({ statusCounts }: InventoryHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.greeting}>Your Pantry</Text>
                    <Text style={styles.title}>My Foods</Text>
                </View>
            </View>

            {/* Status Pills */}
            {statusCounts.total > 0 && (
                <View style={styles.statusRow}>
                    {statusCounts.expired > 0 && (
                        <View style={[styles.statusPill, { backgroundColor: colors.status.expiredBg }]}>
                            <View style={[styles.statusDot, { backgroundColor: colors.status.expired }]} />
                            <Text style={[styles.statusText, { color: colors.status.expired }]}>
                                {statusCounts.expired} expired
                            </Text>
                        </View>
                    )}
                    {statusCounts.expiringSoon > 0 && (
                        <View style={[styles.statusPill, { backgroundColor: colors.status.warningBg }]}>
                            <View style={[styles.statusDot, { backgroundColor: colors.status.warning }]} />
                            <Text style={[styles.statusText, { color: colors.status.warning }]}>
                                {statusCounts.expiringSoon} expiring soon
                            </Text>
                        </View>
                    )}
                    <View style={[styles.statusPill, { backgroundColor: colors.primary.sageMuted }]}>
                        <Text style={[styles.statusText, { color: colors.primary.sage }]}>
                            {statusCounts.total} items
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background.primary,
        marginBottom: spacing.base,
    },
    headerTop: {
        marginBottom: spacing.sm,
    },
    greeting: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        letterSpacing: typography.letterSpacing.wide,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontFamily: typography.fontFamily.display,
        fontSize: typography.size['4xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        letterSpacing: typography.letterSpacing.tight,
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radius.full,
        gap: spacing.xs,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
});
