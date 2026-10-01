import { NativeModules } from 'react-native';

import { IStateful } from '../base/app/types';
import { toState } from '../base/redux/functions';
import { DEFAULT_SERVER_URL } from '../base/settings/constants';
import { getServerURL } from '../base/settings/functions.native';
import { isWelcomePageEnabled } from '../welcome/functions';

export * from './functions.any';

/**
 * Retrieves the branded App's default server URL. Saved stock-Jitsi server
 * preferences cannot silently redirect internal meetings elsewhere.
 *
 * @param {Function|Object} _stateful - The redux store or {@code getState}
 * function.
 * @returns {string} - Default URL for the app.
 */
export function getDefaultURL(_stateful: IStateful) {
    const state = toState(_stateful);

    return isWelcomePageEnabled(state) ? DEFAULT_SERVER_URL : getServerURL(state);
}

/**
 * Returns application name.
 *
 * @returns {string} The application name.
 */
export function getName() {
    return NativeModules.AppInfo.name;
}

/**
 * Returns the path to the Jitsi Meet SDK bundle on iOS. On Android it will be
 * undefined.
 *
 * @returns {string|undefined}
 */
export function getSdkBundlePath() {
    return NativeModules.AppInfo.sdkBundlePath;
}
