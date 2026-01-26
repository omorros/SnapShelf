import React from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    StatusBar,
    Platform,
    SafeAreaView
} from 'react-native';
import { colors, spacing } from '../../theme';

export interface ScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    safeArea?: boolean;
    padding?: boolean;
}

export function Screen({
    children,
    style,
    contentContainerStyle,
    safeArea = true,
    padding = true,
}: ScreenProps) {
    const Container = safeArea ? SafeAreaView : View;

    return (
        <Container style={[styles.container, style]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background.primary}
            />
            <View
                style={[
                    styles.content,
                    padding && styles.padding,
                    contentContainerStyle,
                ]}
            >
                {children}
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    content: {
        flex: 1,
    },
    padding: {
        padding: spacing.base,
    },
});
