import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import logger from '../app/logger';

import { brandPalette } from './brandPalette.native';
import { restoreSession } from './mobileSession.native';

const containerStyle = { alignItems: 'center', flexDirection: 'row', flex: 1, marginRight: 28 } as const;
const textContainerStyle = { flexShrink: 1 } as const;
const monogramStyle = {
    alignItems: 'center', backgroundColor: brandPalette.surfaceMuted, borderRadius: 22,
    height: 44, justifyContent: 'center', marginRight: 14, width: 44
} as const;
const monogramTextStyle = { color: brandPalette.blackMoss, fontSize: 21, fontWeight: '700' } as const;
const accountStyle = { color: brandPalette.blackMoss, fontSize: 17, fontWeight: '700' } as const;
const usernameStyle = { color: brandPalette.textMuted, fontSize: 13, marginTop: 2 } as const;

/**
 * Shows the current account at the top of the settings screen.
 *
 * @returns {ReactElement} Account summary.
 */
export default function InternalCurrentAccountLabel() {
    const [ account, setAccount ] = useState({ name: '', username: '' });

    useEffect(() => {
        restoreSession().then(session => {
            if (session) {
                setAccount({ name: session.user.display_name, username: session.user.username });
            }
        }).catch(cause => logger.error('Unable to read account:', cause));
    }, []);

    return (
        <View style = { containerStyle }>
            <View style = { monogramStyle }>
                <Text style = { monogramTextStyle }>{ (account.name || account.username || '?').charAt(0).toUpperCase() }</Text>
            </View>
            <View style = { textContainerStyle }>
                <Text
                    numberOfLines = { 1 }
                    style = { accountStyle }>{ account.name || account.username }</Text>
                { Boolean(account.username) && <Text style = { usernameStyle }>@{account.username}</Text> }
            </View>
        </View>
    );
}
