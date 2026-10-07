import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import MacWindowCard from './MacWindowCard.native';
import {
    IUpdateProgress,
    dismissAppUpdate,
    downloadAppUpdate,
    installDownloadedUpdate,
    subscribeUpdateProgress
} from './appUpdate.native';
import { brandPalette } from './brandPalette.native';

const colors = { overlay: '#00000066', track: '#DFE6DC' };
const styles = StyleSheet.create({
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: 24 },
    card: { width: '100%', maxWidth: 380 },
    content: { padding: 22 },
    description: { color: brandPalette.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 16 },
    track: { height: 5, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
    fill: { height: 5, backgroundColor: brandPalette.teaLeaf },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
    action: { color: brandPalette.accent, fontSize: 15, fontWeight: '700', paddingVertical: 8 },
    secondary: { color: brandPalette.textMuted, fontSize: 15, paddingVertical: 8 }
});

/**
 * Shows download, integrity verification and the Android installer hand-off.
 *
 * @returns {ReactElement} Update progress dialog.
 */
export default function AppUpdateDialog() {
    const { i18n } = useTranslation();
    const zh = i18n.language?.startsWith('zh');
    const [ state, setState ] = useState<IUpdateProgress>({
        phase: 'idle', received: 0, total: 0, attempt: 1, version: ''
    });

    useEffect(() => subscribeUpdateProgress(setState), []);
    useEffect(() => {
        const listener = AppState.addEventListener('change', value => {
            if (value === 'active' && state.phase === 'permission') {
                // Return to an explicit Continue action; never reopen settings in a loop.
                setState(previous => ({ ...previous, phase: 'ready' }));
            }
        });

        return () => listener.remove();
    }, [ state.phase ]);
    const percent = state.total ? Math.min(100, Math.floor(state.received / state.total * 100)) : 0;
    const retryDownload = useCallback(() => downloadAppUpdate(), []);
    const downloading = [ 'downloading', 'retrying', 'verifying' ].includes(state.phase);
    const description = state.phase === 'error'
        ? (zh ? '下载或校验未完成，安装包未被使用。请检查网络后重试。'
            : 'The download or verification failed. No package was installed. Check your connection and retry.')
        : state.phase === 'verifying'
            ? (zh ? '下载完成，正在检查安装包…' : 'Download complete. Verifying the package…')
            : state.phase === 'permission'
                ? (zh ? '请允许本应用安装更新，返回后点击继续安装。'
                    : 'Allow this app to install updates, then return and continue.')
                : [ 'ready', 'installer' ].includes(state.phase)
                    ? (zh ? '安装包已通过校验，请在系统页面确认安装。'
                        : 'The package is verified. Confirm installation on the Android screen.')
                    : `${zh ? '正在下载' : 'Downloading'} ${percent}% · ${(state.received / 1000000).toFixed(1)} / ${(state.total / 1000000).toFixed(1)} MB${state.attempt > 1 ? ` · ${zh ? '重试' : 'Retry'} ${state.attempt - 1}/2` : ''}`;

    return (
        <Modal
            animationType = 'fade'
            onRequestClose = { dismissAppUpdate }
            transparent = { true }
            visible = { state.phase !== 'idle' }>
            <View style = { styles.overlay }>
                <MacWindowCard
                    style = { styles.card }
                    title = { `${zh ? '应用更新' : 'App update'} · ${state.version}` }>
                    <View style = { styles.content }>
                        <Text style = { styles.description }>{`${zh ? '应用更新' : 'App update'} · ${state.version}`}</Text>
                        <Text style = { styles.description }>{description}</Text>
                        {downloading && <View style = { styles.track }>
                            <View style = { [ styles.fill, { width: `${percent}%` } ] } />
                        </View>}
                        <View style = { styles.actions }>
                            <Pressable
                                accessibilityRole = 'button'
                                onPress = { dismissAppUpdate }>
                                <Text style = { styles.secondary }>{downloading ? (zh ? '取消' : 'Cancel') : (zh ? '稍后' : 'Later')}</Text>
                            </Pressable>
                            {!downloading && <Pressable
                                accessibilityRole = 'button'
                                onPress = { state.phase === 'error' ? retryDownload : installDownloadedUpdate }>
                                <Text style = { styles.action }>{state.phase === 'error'
                                    ? (zh ? '重新下载' : 'Retry download') : (zh ? '继续安装' : 'Continue installation')}</Text>
                            </Pressable>}
                        </View>
                    </View>
                </MacWindowCard>
            </View>
        </Modal>
    );
}
