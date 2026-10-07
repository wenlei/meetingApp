import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, NativeModules, Platform, Pressable, PressableStateCallbackType, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions.native';
import logger from '../app/logger';
import Icon from '../base/icons/components/Icon';
import { IconDownload } from '../base/icons/svg';
import { updateSettings } from '../base/settings/actions';
import Switch from '../base/ui/components/native/Switch';
import FormRow from '../settings/components/native/FormRow';
import FormSection from '../settings/components/native/FormSection';

import { IUpdateManifest, checkAppUpdate, downloadAppUpdate } from './appUpdate.native';
import { brandPalette } from './brandPalette.native';
import {
    biometricLoginState,
    disableBiometricLogin,
    enableBiometricLogin,
    signOut
} from './mobileSession.native';

const statusStyle = {
    color: brandPalette.textMuted,
    fontSize: 13,
    marginBottom: 12,
    marginHorizontal: 18
} as const;
const actionContentStyle = { alignItems: 'center', flexDirection: 'row' } as const;
const actionStyle = { color: brandPalette.accent, fontSize: 14, fontWeight: '700', marginRight: 8 } as const;
const logoutButtonStyle = {
    alignItems: 'center',
    backgroundColor: brandPalette.dangerSurface,
    borderColor: brandPalette.dangerBorder,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: 18,
    marginBottom: 30,
    marginTop: 6,
    minHeight: 52
} as const;
const logoutStyle = { color: brandPalette.dangerText, fontSize: 15, fontWeight: '700' } as const;
const logoutPressedStyle = { backgroundColor: brandPalette.dangerPressed } as const;
const logoutButtonStateStyle = ({ pressed }: PressableStateCallbackType) => [
    logoutButtonStyle, pressed && logoutPressedStyle
];

/**
 * Settings for the branded app's internal account.
 *
 * @returns {ReactElement} Internal account settings.
 */
export default function InternalAccountSettings() {
    const dispatch = useDispatch();
    const { i18n } = useTranslation();
    const isChinese = i18n.language?.startsWith('zh') ?? true;
    const [ biometric, setBiometric ] = useState({ available: false, enabled: false });
    const [ busy, setBusy ] = useState(false);
    const [ status, setStatus ] = useState('');
    const [ updateStatus, setUpdateStatus ] = useState('');
    const [ updateManifest, setUpdateManifest ] = useState<IUpdateManifest>();
    const currentVersion = String(NativeModules.AppInfo?.version ?? '—');
    const currentBuild = String(NativeModules.AppInfo?.buildNumber ?? '—');

    const refreshBiometric = useCallback(async () => {
        const state = await biometricLoginState();

        setBiometric({ available: Boolean(state.type), enabled: Boolean(state.enabled) });
    }, []);

    useEffect(() => {
        refreshBiometric().catch(cause => logger.error('Unable to read biometric state:', cause));
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') {
                refreshBiometric().catch(cause => logger.error('Unable to refresh biometric state:', cause));
            }
        });

        return () => subscription.remove();
    }, [ refreshBiometric ]);

    const toggleBiometric = useCallback(async () => {
        setBusy(true);
        setStatus('');
        try {
            if (biometric.enabled) {
                await disableBiometricLogin();
            } else {
                await enableBiometricLogin();
            }
            await refreshBiometric();
            setStatus(isChinese ? '生物识别登录设置已更新。' : 'Biometric login setting updated.');
        } catch (cause) {
            setStatus(cause instanceof Error ? cause.message : isChinese
                ? '设置失败，请重试。' : 'Could not update this setting.');
        } finally {
            setBusy(false);
        }
    }, [ biometric.enabled, isChinese, refreshBiometric ]);

    const checkUpdate = useCallback(async () => {
        if (Platform.OS !== 'android') {
            setUpdateStatus(isChinese ? '暂未提供应用内更新' : 'In-app updates unavailable');

            return;
        }
        setUpdateStatus(isChinese ? '正在检查…' : 'Checking…');
        try {
            const { hasUpdate, manifest } = await checkAppUpdate();

            if (hasUpdate && manifest) {
                setUpdateManifest(manifest);
                setUpdateStatus(isChinese ? `新版 ${manifest.version} · 下载`
                    : `Version ${manifest.version} · Download`);
            } else {
                setUpdateManifest(undefined);
                setUpdateStatus(isChinese ? '已是最新版本' : 'Up to date');
            }
        } catch (cause) {
            logger.error('Unable to check app update:', cause);
            setUpdateStatus(isChinese ? '检查失败 · 点击重试' : 'Check failed · Retry');
        }
    }, [ isChinese ]);

    useEffect(() => {
        checkUpdate().catch(cause => logger.error('Unable to check app update:', cause));
    }, [ checkUpdate ]);

    const openUpdate = useCallback(async () => {
        if (!updateManifest) {
            await checkUpdate();

            return;
        }
        try {
            await downloadAppUpdate(updateManifest);
        } catch (cause) {
            logger.error('Unable to open app download:', cause);
            setUpdateStatus(isChinese ? '无法打开下载页 · 点击重试'
                : 'Could not open download · Retry');
        }
    }, [ checkUpdate, isChinese, updateManifest ]);

    const logout = useCallback(async () => {
        setBusy(true);
        setStatus('');
        try {
            await signOut();
            dispatch(updateSettings({ displayName: '' }));
            dispatch(appNavigate(undefined));
        } catch (cause) {
            setStatus(cause instanceof Error ? cause.message : isChinese
                ? '退出失败，请稍后重试。' : 'Could not log out. Try again later.');
        } finally {
            setBusy(false);
        }
    }, [ dispatch, isChinese ]);

    return (
        <>
            <FormSection
                label = { isChinese ? '账号与应用' : 'Account and app' }
                summary = { isChinese ? `生物识别 · 版本 ${currentVersion}`
                    : `Biometrics · Version ${currentVersion}` }>
                <FormRow label = { isChinese ? '指纹／面容登录' : 'Fingerprint / face login' }>
                    <Switch
                        checked = { biometric.enabled }
                        disabled = { busy || !biometric.available }
                        onChange = { toggleBiometric } />
                </FormRow>
                {!biometric.available && <Text style = { statusStyle }>
                    {isChinese ? '请先在设备设置中录入指纹或面容。'
                        : 'Set up fingerprint or face recognition in device settings first.'}
                </Text>}
                <FormRow label = { isChinese ? `版本 ${currentVersion} (${currentBuild})` : `Version ${currentVersion} (${currentBuild})` }>
                    <Pressable
                        accessibilityRole = 'button'
                        onPress = { openUpdate }>
                        <View style = { actionContentStyle }>
                            <Text style = { actionStyle }>{ updateStatus || (isChinese ? '正在检查…' : 'Checking…') }</Text>
                            {Boolean(updateManifest) && <Icon
                                color = { brandPalette.accent }
                                size = { 19 }
                                src = { IconDownload } />}
                        </View>
                    </Pressable>
                </FormRow>
                {Boolean(status) && <View><Text style = { statusStyle }>{ status }</Text></View>}
            </FormSection>
            <Pressable
                accessibilityRole = 'button'
                disabled = { busy }
                onPress = { logout }
                style = { logoutButtonStateStyle }>
                <Text style = { logoutStyle }>{ isChinese ? '退出登录' : 'Log out' }</Text>
            </Pressable>
        </>
    );
}
