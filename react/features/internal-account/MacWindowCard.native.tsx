import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { brandAlpha, brandPalette } from './brandPalette.native';

interface IProps {
    children: React.ReactNode;
    defaultExpanded?: boolean;
    disabled?: boolean;
    glass?: boolean;
    onClose?: () => void;
    onCollapse?: () => void;
    style?: StyleProp<ViewStyle>;
    summary?: string;
    title: string;
}

const chrome = { close: '#E97870', closeBorder: '#CA625C', closeInk: '#582E2C' };
const styles = StyleSheet.create({
    card: {
        backgroundColor: brandPalette.surface,
        borderColor: brandPalette.border,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden'
    },
    glass: { backgroundColor: brandAlpha.glass, borderColor: brandAlpha.glassStrong, borderRadius: 20 },
    bar: { alignItems: 'center', backgroundColor: brandPalette.surfaceMuted, flexDirection: 'row', minHeight: 44 },
    glassBar: { backgroundColor: brandAlpha.glassStrong },
    separator: { borderBottomColor: brandAlpha.border, borderBottomWidth: StyleSheet.hairlineWidth },
    closeTarget: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: 44 },
    close: {
        alignItems: 'center', backgroundColor: chrome.close, borderColor: chrome.closeBorder,
        borderRadius: 7, borderWidth: 1, height: 14, justifyContent: 'center', width: 14
    },
    inactive: { opacity: 0.4 },
    heading: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 44, paddingVertical: 8 },
    title: { color: brandPalette.blackMoss, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    summary: { color: brandPalette.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
    balance: { width: 44 }
});

/**
 * Shared window chrome. Persistent cards collapse; dialogs supply a real close action.
 *
 * @returns {ReactElement} A card with one accessible close control and no extra window controls.
 */
export default function MacWindowCard({
    children, defaultExpanded = true, disabled = false, glass = false,
    onClose, onCollapse, style, summary, title
}: IProps) {
    const { i18n } = useTranslation();
    const zh = i18n.language?.startsWith('zh');
    const [ expanded, setExpanded ] = useState(defaultExpanded);
    const close = useCallback(() => {
        if (onClose) {
            onClose();
        } else {
            onCollapse?.();
            setExpanded(false);
        }
    }, [ onClose, onCollapse ]);
    const reopen = useCallback(() => setExpanded(true), []);

    return (
        <View style = { [ styles.card, glass && styles.glass, style ] }>
            <View style = { [ styles.bar, glass && styles.glassBar, expanded && styles.separator ] }>
                <Pressable
                    accessibilityLabel = { `${zh ? '关闭' : 'Close'} ${title}` }
                    accessibilityRole = 'button'
                    accessibilityState = {{ disabled: disabled || !expanded }}
                    disabled = { disabled || !expanded }
                    onPress = { close }
                    style = { styles.closeTarget }>
                    <View style = { [ styles.close, (disabled || !expanded) && styles.inactive ] }>
                        <Svg
                            height = { 8 }
                            viewBox = '0 0 12 12'
                            width = { 8 }>
                            <Path
                                d = 'M3 3l6 6M9 3L3 9'
                                stroke = { chrome.closeInk }
                                strokeLinecap = 'round'
                                strokeWidth = { 1.5 } />
                        </Svg>
                    </View>
                </Pressable>
                <Pressable
                    accessibilityHint = { !expanded ? (zh ? '点击标题重新展开' : 'Tap the title to reopen') : undefined }
                    accessibilityRole = { expanded ? 'header' : 'button' }
                    accessibilityState = {{ expanded }}
                    disabled = { expanded || disabled }
                    onPress = { reopen }
                    style = { styles.heading }>
                    <Text style = { styles.title }>{ title }</Text>
                    {!expanded && <Text style = { styles.summary }>
                        { summary || (zh ? '点击标题展开' : 'Tap to open') }
                    </Text>}
                </Pressable>
                <View
                    pointerEvents = 'none'
                    style = { styles.balance } />
            </View>
            { expanded && children }
        </View>
    );
}
