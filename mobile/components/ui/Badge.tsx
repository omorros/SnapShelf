import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface BadgeProps {
    label: string;
    color?: string; // Text color
    backgroundColor?: string;
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
}

export function Badge({
    label,
    color = colors.text.primary,
    backgroundColor = colors.background.secondary,
    size = 'md',
    icon,
}: BadgeProps) {
    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                size === 'sm' ? styles.sm : styles.md,
            ]}
        >
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text
                style={[
                    styles.label,
                    { color },
                    size === 'sm' ? styles.labelSm : styles.labelMd,
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.full,
        justifyContent: 'center',
    },
    sm: {
        height: 24,
        paddingHorizontal: spacing.sm,
    },
    md: {
        height: 32,
        paddingHorizontal: spacing.md,
    },
    iconContainer: {
        marginRight: spacing.xs,
    },
    label: {
        fontFamily: typography.fontFamily.body,
        fontWeight: typography.weight.medium,
    },
    labelSm: {
        fontSize: typography.size.xs,
    },
    labelMd: {
        fontSize: typography.size.sm,
    },
});
