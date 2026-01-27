import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, radius, layout, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    label,
    icon,
    loading = false,
    fullWidth = false,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: colors.primary.sage,
                    borderWidth: 0,
                };
            case 'secondary':
                return {
                    backgroundColor: colors.background.secondary,
                    borderWidth: 0,
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: colors.primary.sage,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                };
            case 'danger':
                return {
                    backgroundColor: colors.status.error,
                    borderWidth: 0,
                };
            default:
                return {};
        }
    };

    const getVariantTextStyle = (): TextStyle => {
        switch (variant) {
            case 'primary':
            case 'danger':
                return { color: colors.text.inverse };
            case 'secondary':
                return { color: colors.text.primary };
            case 'outline':
            case 'ghost':
                return { color: colors.primary.sage };
            default:
                return { color: colors.text.primary };
        }
    };

    const getSizeStyle = (): ViewStyle => {
        switch (size) {
            case 'sm':
                return {
                    height: 36,
                    paddingHorizontal: spacing.md,
                };
            case 'md':
                return {
                    height: layout.buttonHeight, // 52
                    paddingHorizontal: spacing.xl,
                };
            case 'lg':
                return {
                    height: 60,
                    paddingHorizontal: spacing.xl,
                };
            default:
                return {};
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                getVariantStyle(),
                getSizeStyle(),
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            disabled={isDisabled}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' ? colors.primary.sage : colors.text.inverse}
                />
            ) : (
                <>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={size === 'sm' ? 16 : 20}
                            color={getVariantTextStyle().color}
                            style={label ? { marginRight: spacing.sm } : undefined}
                        />
                    )}
                    {label ? (
                        <Text
                            style={[
                                styles.label,
                                { fontSize: size === 'sm' ? typography.size.sm : typography.size.md },
                                getVariantTextStyle(),
                            ]}
                        >
                            {label}
                        </Text>
                    ) : null}
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.base,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    label: {
        fontFamily: typography.fontFamily.body,
        fontWeight: typography.weight.semibold,
    },
});
