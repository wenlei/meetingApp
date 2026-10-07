import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { brandAlpha, brandPalette } from './brandPalette.native';

interface IProps {
    children: React.ReactNode;
    glass?: boolean;
    style?: StyleProp<ViewStyle>;
    title: string;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: brandPalette.surface,
        borderColor: brandPalette.border,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden'
    },
    glass: { backgroundColor: brandAlpha.glass, borderColor: brandAlpha.glassStrong, borderRadius: 20 }
});

/** Native cards are always open, without desktop window chrome. */
export default function MacWindowCard({ children, glass = false, style, title }: IProps) {
    return (
        <View
            accessibilityLabel = { title }
            style = { [ styles.card, glass && styles.glass, style ] }>
            { children }
        </View>
    );
}
