import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadows } from '../../theme';

export interface CardProps extends ViewProps {
    variant?: 'default' | 'elevated' | 'outlined';
    padding?: keyof typeof spacing;
}

export function Card({
    variant = 'default',
    padding = 'base',
    style,
    children,
    ...props
}: CardProps) {
    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'default':
                return {
                    backgroundColor: colors.background.card,
                    ...shadows.base,
                    borderWidth: 0,
                };
            case 'elevated':
                return {
                    backgroundColor: colors.background.card,
                    ...shadows.md,
                    borderWidth: 0,
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.ui.border,
                    ...shadows.none,
                };
            default:
                return {};
        }
    };

    return (
        <View
            style={[
                styles.container,
                getVariantStyle(),
                { padding: spacing[padding] },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radius.lg,
    },
});
