import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, AppState, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { brandPalette } from './brandPalette.native';
import { loginPrismHTML } from './loginPrismHTML';

const styles = StyleSheet.create({
    container: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0,
        backgroundColor: brandPalette.blackMoss },
    webview: { backgroundColor: brandPalette.blackMoss, flex: 1 },
    renderer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }
});
const blockNavigation = () => false;

interface IProps {
    reduceMotion: boolean;
}

/**
 * Offline, live Fera canvas. This surface receives no account data or input.
 *
 * @returns {ReactElement} Non-interactive background.
 */
export default function LoginPrismBackground({ reduceMotion }: IProps) {
    const webview = useRef<WebView>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const source = useMemo(() => ({ html: loginPrismHTML(reduceMotion) }), [ reduceMotion ]);
    const ready = useCallback((event: WebViewMessageEvent) => {
        if (event.nativeEvent.data === 'prism-ready') {
            Animated.timing(opacity, { duration: 160, toValue: 1, useNativeDriver: true }).start();
        }
    }, [ opacity ]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            webview.current?.injectJavaScript(`window.setPrismActive?.(${state === 'active'});true;`);
        });

        return () => subscription.remove();
    }, []);

    return (
        <View
            pointerEvents = 'none'
            style = { styles.container }>
            <Animated.View style = { [ styles.renderer, { opacity } ] }>
                <WebView
                    allowFileAccess = { false }
                    bounces = { false }
                    domStorageEnabled = { false }
                    javaScriptEnabled = { true }
                    onMessage = { ready }
                    onShouldStartLoadWithRequest = { blockNavigation }
                    overScrollMode = 'never'
                    ref = { webview }
                    scrollEnabled = { false }
                    setSupportMultipleWindows = { false }
                    source = { source }
                    style = { styles.webview } />
            </Animated.View>
        </View>
    );
}
