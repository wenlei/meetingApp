import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import logger from '../app/logger';

import { deviceId, requestDeviceJoin } from './deviceHandoff.native';
import { handoffConferenceLeft, registerMediaHandoff } from './handoffMedia.native';

const ACCOUNT_URL = 'https://113.46.187.140:18003';

export const MEETING_URL = 'https://113.46.187.140:18001';
const KEYCHAIN_SERVICE = 'com.guangyuxinneng.meeting.account';
const BIOMETRIC_SERVICE = 'com.guangyuxinneng.meeting.account.biometric';
const BIOMETRIC_PREFERENCE = 'com.guangyuxinneng.meeting.biometric-preference.';
const ROOM_RE = /^[A-Za-z0-9_-]{6,64}$/;

export interface IAccountUser {
    display_name: string;
    id: number;
    username: string;
}

export interface IMeetingReservation {
    date: string;
    end_time: string;
    id: number;
    meeting_room: string;
    meeting_url: string;
    organizer: { display_name: string; username: string; } | null;
    start_time: string;
    title: string;
}

interface IAccountSession {
    token: string;
    user: IAccountUser;
}

let currentSession: IAccountSession | null = null;
let restorePromise: Promise<IAccountSession | null> | null = null;
let pendingRoom: string | null = null;
let pendingError: string | null = null;
const sessionListeners = new Set<(user: IAccountUser | null) => void>();

function setCurrentSession(session: IAccountSession | null) {
    currentSession = session;
    sessionListeners.forEach(listener => listener(session?.user || null));
}

export function subscribeAccountSession(listener: (user: IAccountUser | null) => void) {
    sessionListeners.add(listener);

    return () => {
        sessionListeners.delete(listener);
    };
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
    try {
        return await response.json();
    } catch (_) {
        throw new Error('账号服务返回了无效响应，请稍后再试。');
    }
}

function userFrom(value: unknown): IAccountUser {
    if (!value || typeof value !== 'object') {
        throw new Error('账号信息不完整，请重新登录。');
    }
    const { display_name, id, username } = value as Record<string, unknown>;

    if (typeof display_name !== 'string' || typeof id !== 'number' || typeof username !== 'string') {
        throw new Error('账号信息不完整，请重新登录。');
    }

    return { display_name, id, username };
}

async function clearLocalSession() {
    handoffConferenceLeft();
    setCurrentSession(null);
    restorePromise = null;
    await Promise.all([
        Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }),
        Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE })
    ]);
}

async function verifyStoredSession(token: string): Promise<IAccountSession | null> {
    const response = await fetch(`${ACCOUNT_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
        await clearLocalSession();

        return null;
    }
    if (!response.ok) {
        throw new Error('暂时无法连接账号服务，请检查网络后重试。');
    }
    const data = await responseBody(response);

    setCurrentSession({ token, user: userFrom(data.user) });

    return currentSession;
}

export async function biometricLoginState() {
    const [ type, enabled ] = await Promise.all([
        Keychain.getSupportedBiometryType(),
        Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE })
    ]);

    return { type, enabled };
}

export async function restoreSession(): Promise<IAccountSession | null> {
    if (currentSession) {
        return currentSession;
    }
    if (restorePromise) {
        return restorePromise;
    }
    restorePromise = (async () => {
        // A protected credential must never be read silently on app launch.
        if (await Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE })) {
            return null;
        }
        const saved = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });

        return saved ? verifyStoredSession(saved.password) : null;
    })();

    try {
        return await restorePromise;
    } finally {
        restorePromise = null;
    }
}

export async function signInWithBiometrics(): Promise<IAccountUser> {
    if (!await Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE })) {
        throw new Error('请先使用账号密码登录并开启生物识别。');
    }
    let saved;

    try {
        saved = await Keychain.getGenericPassword({
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            authenticationPrompt: { title: '验证身份以登录会议室', cancel: '取消' },
            service: BIOMETRIC_SERVICE
        });
    } catch (_) {
        throw new Error('未完成生物识别，请重试或使用账号密码登录。');
    }
    if (!saved) {
        throw new Error('生物识别不可用，请使用账号密码登录。');
    }
    const session = await verifyStoredSession(saved.password);

    if (!session) {
        throw new Error('登录已失效，请使用账号密码重新登录。');
    }

    return session.user;
}

export async function enableBiometricLogin(): Promise<void> {
    const session = await restoreSession();

    if (!session) {
        throw new Error('请先登录内部账号。');
    }
    if (!await Keychain.getSupportedBiometryType()) {
        throw new Error('请先在设备设置中录入指纹或面容。');
    }
    try {
        const stored = await Keychain.setGenericPassword(session.user.username, session.token, {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            service: BIOMETRIC_SERVICE
        });

        if (!stored) {
            throw new Error('无法保护登录凭证。');
        }
        const verified = await Keychain.getGenericPassword({
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            authenticationPrompt: { title: '验证身份并开启生物识别登录', cancel: '取消' },
            service: BIOMETRIC_SERVICE
        });

        if (!verified || verified.password !== session.token) {
            throw new Error('生物识别验证未完成。');
        }
    } catch (_) {
        await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
        throw new Error('未能开启生物识别，请确认设备已录入指纹或面容。');
    }
    // Only remove the ordinary credential after the protected one was read successfully.
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    await AsyncStorage.setItem(`${BIOMETRIC_PREFERENCE}${session.user.id}`, 'enabled');
}

export async function disableBiometricLogin(): Promise<void> {
    const session = await restoreSession();

    if (!session) {
        throw new Error('请先登录内部账号。');
    }
    const stored = await Keychain.setGenericPassword(session.user.username, session.token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: KEYCHAIN_SERVICE
    });

    if (!stored) {
        throw new Error('无法保存登录状态，请稍后再试。');
    }
    // Remember an explicit opt-out across logout and subsequent password logins.
    await AsyncStorage.setItem(`${BIOMETRIC_PREFERENCE}${session.user.id}`, 'disabled');
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
}

export async function signIn(username: string, password: string): Promise<IAccountUser> {
    const response = await fetch(`${ACCOUNT_URL}/api/sessions`, {
        body: JSON.stringify({ username: username.trim(), password }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
    });
    const data = await responseBody(response);

    if (!response.ok) {
        throw new Error(response.status === 401 ? '用户名或密码不正确。'
            : response.status === 429 ? '登录尝试过多，请稍后再试。'
                : '暂时无法登录，请稍后再试。');
    }
    if (typeof data.access_token !== 'string') {
        throw new Error('账号服务没有返回登录凭证。');
    }
    const user = userFrom(data.user);

    // Never reuse a protected credential belonging to a prior account.
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
    const stored = await Keychain.setGenericPassword(user.username, data.access_token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: KEYCHAIN_SERVICE
    });

    if (!stored) {
        throw new Error('无法安全保存登录状态，请稍后再试。');
    }
    setCurrentSession({ token: data.access_token, user });

    try {
        const preference = await AsyncStorage.getItem(`${BIOMETRIC_PREFERENCE}${user.id}`);

        if (preference !== 'disabled' && await Keychain.getSupportedBiometryType()) {
            // Default on, but only after password authentication and native biometric verification.
            await enableBiometricLogin();
        }
    } catch (_) {
        // Cancelling setup or an unavailable sensor must not turn a successful password login into a failure.
        logger.info('Biometric setup was not completed; keeping password login available.');
    }

    return user;
}

export async function signOut(): Promise<void> {
    let session = currentSession;

    if (!session) {
        try {
            session = await restoreSession();
        } catch (_) {
            // Offline logout must still remove the local credential.
        }
    }

    await clearLocalSession();
    if (session) {
        try {
            await fetch(`${ACCOUNT_URL}/api/sessions`, {
                headers: { Authorization: `Bearer ${session.token}` },
                method: 'DELETE'
            });
        } catch (_) {
            // The local credential is gone even when the remote service is offline.
        }
    }
}

export async function roomURL(room: string): Promise<string> {
    if (!ROOM_RE.test(room)) {
        throw new Error('会议室名称须为 6–64 位英文字母、数字、- 或 _。');
    }
    const session = await restoreSession();

    if (!session) {
        throw new Error('请先登录内部账号。');
    }
    const response = await requestDeviceJoin(room, async body => {
        // A delayed confirmation must not use an account that has signed out.
        if (currentSession?.token !== session.token) {
            throw new Error('登录状态已变化，请重新进入会议。');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            return await fetch(`${MEETING_URL}/account/api/mobile-token`, {
                body: JSON.stringify(body),
                headers: {
                    Authorization: `Bearer ${session.token}`,
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
    });

    if (response.status === 401) {
        await clearLocalSession();
        throw new Error('登录已失效，请重新登录。');
    }
    if (!response.ok) {
        throw new Error('暂时无法获取会议凭证，请稍后再试。');
    }
    const data = await responseBody(response);

    if (typeof data.token !== 'string') {
        throw new Error('会议凭证无效，请稍后再试。');
    }
    if (data.handoff_pending && typeof data.device_ticket === 'string') {
        const ticket = data.device_ticket;
        const signal = async (action: string) => {
            if (action === 'ready' && currentSession?.token !== session.token) {
                throw new Error('登录状态已变化。');
            }
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
                const result = await fetch(`${MEETING_URL}/account/api/device-${action}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room, ticket }),
                    signal: controller.signal
                });

                if (!result.ok) {
                    throw new Error('设备切换确认失败。');
                }
            } finally {
                clearTimeout(timeout);
            }
        };

        registerMediaHandoff({
            room,
            commit: async () => {
                try {
                    await signal('ready');
                } catch (_) {
                    // A lost acknowledgement may follow a successful commit.
                    // Repeating the same ticket is server-side idempotent.
                    await signal('ready');
                }
            },
            cancel: () => signal('cancel'),
            error: () => queueAccountError('设备切换尚未确认，请检查网络后重试。')
        });
    } else {
        handoffConferenceLeft();
    }

    return `${MEETING_URL}/${room}?jwt=${encodeURIComponent(data.token)}`;
}

export interface IActiveMeetingDevice {
    device: string;
    is_local: boolean;
    replace: string;
    room: string;
    switching: boolean;
}

export async function activeMeetingDevices(): Promise<IActiveMeetingDevice[]> {
    const session = await restoreSession();

    if (!session) {
        return [];
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;

    try {
        response = await fetch(`${MEETING_URL}/account/api/devices?device_id=${encodeURIComponent(await deviceId())}`, {
            headers: { Authorization: `Bearer ${session.token}` },
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new Error('暂时无法检查其他设备。');
    }
    const data = await responseBody(response);

    if (!Array.isArray(data.devices)) {
        throw new Error('设备状态无效。');
    }

    return data.devices.filter((item): item is IActiveMeetingDevice => Boolean(item && typeof item === 'object'
        && typeof item.room === 'string' && ROOM_RE.test(item.room) && typeof item.replace === 'string'
        && typeof item.device === 'string' && typeof item.is_local === 'boolean' && typeof item.switching === 'boolean'));
}

export async function meetingReservations(): Promise<IMeetingReservation[]> {
    const session = await restoreSession();

    if (!session) {
        return [];
    }
    const response = await fetch(`${ACCOUNT_URL}/api/meeting-reservations`, {
        headers: { Authorization: `Bearer ${session.token}` }
    });

    if (response.status === 401) {
        await clearLocalSession();

        return [];
    }
    if (!response.ok) {
        throw new Error('暂时无法读取会议邀请。');
    }
    const data = await responseBody(response);

    return Array.isArray(data.meetings) ? data.meetings.filter((item: unknown) => {
        if (!item || typeof item !== 'object') {
            return false;
        }
        const meeting = item as Record<string, unknown>;

        return typeof meeting.id === 'number' && typeof meeting.title === 'string'
            && typeof meeting.date === 'string' && typeof meeting.start_time === 'string'
            && typeof meeting.end_time === 'string' && typeof meeting.meeting_url === 'string';
    }) as IMeetingReservation[] : [];
}

export function queueRoom(room: string) {
    pendingRoom = room;
}

export function takePendingRoom(): string | null {
    const room = pendingRoom;

    pendingRoom = null;

    return room;
}

export function queueAccountError(message: string) {
    pendingError = message;
}

export function takeAccountError(): string | null {
    const error = pendingError;

    pendingError = null;

    return error;
}
