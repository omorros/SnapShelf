import React, { useState } from 'react';
import {
    TextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { colors, spacing, radius, typography, layout } from '../../theme';

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export function Input({
    label,
    error,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    !!error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={colors.text.muted}
                onFocus={handleFocus}
                onBlur={handleBlur}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.background.secondary,
        borderRadius: radius.base,
        height: layout.inputHeight,
        paddingHorizontal: spacing.base,
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.md,
        color: colors.text.primary,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.primary.sage,
        backgroundColor: colors.background.card,
    },
    inputError: {
        borderColor: colors.status.error,
    },
    errorText: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.size.xs,
        color: colors.status.error,
        marginTop: spacing.xs,
    },
});
