import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions.native';

import { brandPalette as colors } from './brandPalette.native';
import { selectDeviceHandoff } from './deviceHandoff.native';
import { IActiveMeetingDevice, activeMeetingDevices } from './mobileSession.native';

const styles = StyleSheet.create({
    block: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 18, paddingVertical: 10 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
    details: { flex: 1 },
    title: { color: colors.blackMoss, fontSize: 14, fontWeight: '600' },
    subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    button: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 10, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 12 },
    buttonText: { color: colors.blackMoss, fontSize: 13, fontWeight: '600' },
    error: { color: colors.dangerText, fontSize: 12 }
});

/**
 * Show other-device meetings after login; only an explicit tap starts handoff.
 *
 * @returns {ReactElement|null} Compact meeting and transfer actions.
 */
export default function ActiveDeviceHandoff() {
    const dispatch = useDispatch();
    const focused = useIsFocused();
    const { i18n } = useTranslation();
    const chinese = i18n.language?.startsWith('zh');
    const [ devices, setDevices ] = useState<IActiveMeetingDevice[]>([]);
    const [ busy, setBusy ] = useState(false);
    const [ failed, setFailed ] = useState(false);
    const locked = useRef(false);

    useEffect(() => {
        if (!focused) {
            return;
        }
        let active = true;
        let fetching = false;
        const refresh = async () => {
            if (fetching || AppState.currentState !== 'active') {
                return;
            }
            fetching = true;
            try {
                const result = await activeMeetingDevices();

                if (active) {
                    setDevices(result.filter(item => !item.is_local));
                    setFailed(false);
                }
            } catch (_) {
                if (active) {
                    setFailed(true);
                }
            } finally {
                fetching = false;
            }
        };

        void refresh();
        const timer = setInterval(refresh, 15000);
        const listener = AppState.addEventListener('change', state => state === 'active' && refresh());

        return () => {
            active = false;
            clearInterval(timer);
            listener.remove();
        };
    }, [ focused ]);

    const transfer = useCallback(async (device: IActiveMeetingDevice) => {
        if (locked.current || device.switching || failed) {
            return;
        }
        locked.current = true;
        setBusy(true);
        selectDeviceHandoff(device.room, device.replace);
        try {
            await dispatch(appNavigate(device.room));
        } finally {
            locked.current = false;
            setBusy(false);
        }
    }, [ dispatch, failed ]);

    if (!devices.length && !failed) {
        return null;
    }

    return (
        <View style = { styles.block }>
            { failed && <Text style = { styles.error }>{chinese ? '暂时无法检查其他设备，将自动重试。' : 'Cannot check other devices. Retrying automatically.'}</Text> }
            {devices.map(device => (
                <DeviceRow
                    busy = { busy }
                    chinese = { Boolean(chinese) }
                    device = { device }
                    failed = { failed }
                    key = { device.room }
                    onTransfer = { transfer } />
            ))}
        </View>
    );
}

// Private presentation helpers belong to this single handoff affordance.
// eslint-disable-next-line react/no-multi-comp
function DeviceRow({ busy, chinese, device, failed, onTransfer }: {
    busy: boolean;
    chinese: boolean;
    device: IActiveMeetingDevice;
    failed: boolean;
    onTransfer: (device: IActiveMeetingDevice) => Promise<void>;
}) {
    const onPress = useCallback(() => onTransfer(device), [ device, onTransfer ]);
    const switching = busy || device.switching;

    return (
        <View style = { styles.row }>
            <View style = { styles.details }>
                <Text
                    numberOfLines = { 1 }
                    style = { styles.title }>{ device.room }</Text>
                <Text style = { styles.subtitle }>{chinese ? `正在 ${device.device} 参会` : `In meeting on ${device.device}`}</Text>
            </View>
            <Pressable
                accessibilityLabel = { chinese ? `将 ${device.room} 切换到本机` : `Move ${device.room} to this device` }
                accessibilityRole = 'button'
                disabled = { switching || failed }
                onPress = { onPress }
                style = { styles.button }>
                {switching ? <ActivityIndicator
                    color = { colors.blackMoss }
                    size = 'small' /> : <TransferIcon />}
                <Text style = { styles.buttonText }>{switching
                    ? (chinese ? '切换中' : 'Switching') : (chinese ? '切换到本机' : 'Switch here')}</Text>
            </Pressable>
        </View>
    );
}

// eslint-disable-next-line react/no-multi-comp
function TransferIcon() {
    return (
        <Svg
            fill = 'none'
            height = { 24 }
            stroke = { colors.blackMoss }
            strokeWidth = { 1.6 }
            viewBox = '0 0 24 24'
            width = { 24 }>
            <Rect
                height = { 11 }
                rx = { 1.5 }
                width = { 13 }
                x = { 1 }
                y = { 3 } />
            <Path d = 'M7.5 14v4m-3 0h5M13 9h7m-3-3 3 3-3 3' />
            <Rect
                height = { 10 }
                rx = { 1.5 }
                width = { 6 }
                x = { 16 }
                y = { 13 } />
        </Svg>
    );
}
