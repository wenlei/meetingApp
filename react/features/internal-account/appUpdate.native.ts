import { Alert, DeviceEventEmitter, NativeModules, Platform } from 'react-native';

import logger from '../app/logger';

import { MEETING_URL } from './mobileSession.native';

export interface IUpdateManifest {
    sha256: string;
    size: number;
    universalSha256?: string;
    universalSize?: number;
    universalUrl?: string;
    url: string;
    version: string;
    versionCode?: number;
}

export interface IUpdateResult {
    currentVersion: string;
    hasUpdate: boolean;
    manifest?: IUpdateManifest;
}

let promptedVersionCode = 0;

export interface IUpdateProgress {
    attempt: number;
    phase: 'idle' | 'downloading' | 'retrying' | 'verifying' | 'ready' | 'permission' | 'installer' | 'error';
    received: number;
    total: number;
    version: string;
}

let updateProgress: IUpdateProgress = { attempt: 1, phase: 'idle', received: 0, total: 0, version: '' };
let selectedManifest: IUpdateManifest | undefined;
const progressListeners = new Set<(state: IUpdateProgress) => void>();

function reportProgress(change: Partial<IUpdateProgress>) {
    updateProgress = { ...updateProgress, ...change };
    progressListeners.forEach(listener => listener(updateProgress));
}

DeviceEventEmitter.addListener('AppUpdateProgress', event => reportProgress(event));

export function subscribeUpdateProgress(listener: (state: IUpdateProgress) => void) {
    progressListeners.add(listener);
    listener(updateProgress);

    return () => {
        progressListeners.delete(listener);
    };
}

export async function installDownloadedUpdate() {
    try {
        const phase = await NativeModules.AppUpdate.install();

        reportProgress({ phase });
    } catch (error) {
        logger.warn('Unable to install verified update:', error);
        reportProgress({ phase: 'error' });
    }
}

export async function downloadAppUpdate(manifest = selectedManifest) {
    if (!manifest || [ 'downloading', 'retrying', 'verifying' ].includes(updateProgress.phase)) {
        return;
    }
    selectedManifest = manifest;
    reportProgress({ phase: 'downloading', received: 0, total: manifest.size, version: manifest.version, attempt: 1 });
    try {
        await NativeModules.AppUpdate.download(manifest);
        reportProgress({ phase: 'ready' });
        await installDownloadedUpdate();
    } catch (error) {
        const cancelled = (error as { code?: string; })?.code === 'update_cancelled';

        logger.warn('App update download did not complete:', error);
        reportProgress({ phase: cancelled ? 'idle' : 'error' });
    }
}

export function dismissAppUpdate() {
    if ([ 'downloading', 'retrying', 'verifying' ].includes(updateProgress.phase)) {
        NativeModules.AppUpdate.cancel();
    } else {
        reportProgress({ phase: 'idle' });
    }
}

function compareVersions(left: string, right: string): number {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);

    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
        const difference = (leftParts[index] || 0) - (rightParts[index] || 0);

        if (difference) {
            return difference;
        }
    }

    return 0;
}

/**
 * Checks the signed Android release published by the meeting server.
 *
 * @returns {Promise<IUpdateResult>} The current update state.
 */
export async function checkAppUpdate(): Promise<IUpdateResult> {
    const currentVersion = String(NativeModules.AppInfo?.version ?? '—');

    if (Platform.OS !== 'android') {
        return { currentVersion, hasUpdate: false };
    }

    const currentVersionCode = Number(NativeModules.AppInfo?.buildNumber ?? 0);
    const response = await fetch(`${MEETING_URL}/android/version.json?t=${Date.now()}`);

    if (!response.ok) {
        throw new Error('update_check_failed');
    }

    const manifest = await response.json() as IUpdateManifest;

    if (NativeModules.AppUpdate?.supportsArm64 === false) {
        manifest.url = manifest.universalUrl ?? '';
        manifest.sha256 = manifest.universalSha256 ?? '';
        manifest.size = manifest.universalSize ?? 0;
    }

    if (typeof manifest.version !== 'string' || typeof manifest.url !== 'string'
            || !manifest.url.startsWith(`${MEETING_URL}/android/`)
            || !Number.isSafeInteger(manifest.size) || manifest.size <= 0
            || !/^[a-fA-F0-9]{64}$/.test(manifest.sha256)) {
        throw new Error('update_manifest_invalid');
    }

    const hasVersionCode = Number.isSafeInteger(manifest.versionCode)
        && Number(manifest.versionCode) > 0
        && Number.isSafeInteger(currentVersionCode)
        && currentVersionCode > 0;
    const hasUpdate = hasVersionCode
        ? Number(manifest.versionCode) > currentVersionCode
        : compareVersions(manifest.version, currentVersion) > 0;

    return { currentVersion, hasUpdate, manifest };
}

/**
 * Checks for an update on app startup and offers the published download.
 * Android still shows its normal installation confirmation for security.
 *
 * @param {boolean} isChinese - Whether to display Chinese copy.
 * @returns {Promise<void>}
 */
export async function promptAppUpdate(isChinese: boolean): Promise<void> {
    try {
        const result = await checkAppUpdate();

        if (!result.hasUpdate || !result.manifest) {
            return;
        }

        const versionCode = Number(result.manifest.versionCode ?? 0);

        if (versionCode > 0 && promptedVersionCode === versionCode) {
            return;
        }
        promptedVersionCode = versionCode;

        Alert.alert(
            isChinese ? '发现新版本' : 'Update available',
            isChinese
                ? `光域新能会议室 ${result.manifest.version} 已发布。现在下载更新吗？`
                : `Guangyu Meeting ${result.manifest.version} is available. Download it now?`,
            [
                { text: isChinese ? '稍后' : 'Later', style: 'cancel' },
                {
                    onPress: () => {
                        downloadAppUpdate(result.manifest);
                    },
                    text: isChinese ? '下载更新' : 'Download'
                }
            ]
        );
    } catch (cause) {
        logger.warn('Automatic app update check failed:', cause);
    }
}
