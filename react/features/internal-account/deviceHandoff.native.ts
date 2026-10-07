import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { v4 as uuid } from 'uuid';

import i18next from '../base/i18n/i18next';

const DEVICE_KEY = 'com.guangyuxinneng.meeting.device';
let devicePromise: Promise<string> | undefined;
let selected: { replace: string; room: string; } | undefined;

export class DeviceSwitchCancelled extends Error {}

export function deviceId(): Promise<string> {
    devicePromise ??= (async () => {
        const stored = await AsyncStorage.getItem(DEVICE_KEY);

        if (stored && /^[A-Za-z0-9_-]{16,80}$/.test(stored)) {
            return stored;
        }
        const id = uuid();

        // App-scoped random ID. No IMEI, advertising ID or hardware fingerprint.
        await AsyncStorage.setItem(DEVICE_KEY, id);

        return id;
    })().catch(error => {
        devicePromise = undefined;
        throw error;
    });

    return devicePromise;
}

export function selectDeviceHandoff(room: string, replace: string) {
    selected = { room: room.toLowerCase(), replace };
}

function confirmSwitch(device: string): Promise<boolean> {
    const chinese = i18next.language?.startsWith('zh');

    return new Promise(resolve => {
        Alert.alert(
            chinese ? '切换到此设备？' : 'Switch to this device?',
            chinese
                ? `此账号正在${device}参加这场会议。切换后，旧设备仅离开本场会议，不会退出账号或结束其他人的会议。`
                : `This account is in this meeting on ${device}. Switching leaves the meeting on the old device without signing it out or ending the meeting for anyone else.`,
            [
                { text: chinese ? '取消' : 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: chinese ? '切换到此设备' : 'Switch here', onPress: () => resolve(true) }
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        );
    });
}

/**
 * Ask once for an explicit replacement; never silently retry a changed target.
 *
 * @param {string} room - The destination room.
 * @param {Function} request - Authenticated credential request.
 * @returns {Promise<Response>} The final credential response.
 */
export async function requestDeviceJoin(room: string, request: (body: Record<string, string>) => Promise<Response>) {
    const choice = selected?.room === room.toLowerCase() ? selected : undefined;

    selected = undefined;
    const body = { room, device_id: await deviceId(), device_kind: Platform.OS === 'ios' ? 'ios' : 'android',
        ...(choice ? { device_replace: choice.replace } : {}) };
    let response = await request(body);

    if (response.status === 409) {
        const conflict = await response.json();

        if (choice || conflict.error !== 'device_conflict' || typeof conflict.replace !== 'string') {
            throw new Error('设备状态已变化，请重新进入会议。');
        }
        if (!await confirmSwitch(typeof conflict.device === 'string' ? conflict.device : '另一台设备')) {
            throw new DeviceSwitchCancelled();
        }
        response = await request({ ...body, device_replace: conflict.replace });
        if (response.status === 409) {
            throw new Error('设备状态已变化，请重新进入会议。原设备不受影响。');
        }
    }

    return response;
}
