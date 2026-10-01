import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { updateSettings } from '../../../base/settings/actions';
import Switch from '../../../base/ui/components/native/Switch';
import { isWelcomePageEnabled } from '../../../welcome/functions';
import { getNotificationsTabProps } from '../../functions.any';

import FormRow from './FormRow';
import FormSection from './FormSection';
import styles from './styles';

const NotificationsSection = () => {
    const { i18n } = useTranslation();
    const isChinese = i18n.language?.startsWith('zh') ?? true;
    const dispatch = useDispatch();
    const brandedApp = useSelector(isWelcomePageEnabled);
    const {
        soundsIncomingMessage,
        soundsParticipantJoined,
        soundsParticipantKnocking,
        soundsParticipantLeft,
        soundsReactions,
        soundsTalkWhileMuted,
        enableReactions,
        enabledNotifications,
        disabledSounds,
        moderatorMutedSoundsReactions
    } = useSelector((state: IReduxState) => getNotificationsTabProps(state));

    const sounds = useMemo(() => {
        const partialSounds = [
            {
                label: 'settings.reactions',
                state: soundsReactions,
                name: 'soundsReactions',
                disabled: Boolean(moderatorMutedSoundsReactions
                    || disabledSounds.includes('REACTION_SOUND'))
            },
            {
                label: 'settings.incomingMessage',
                state: soundsIncomingMessage,
                name: 'soundsIncomingMessage'
            },
            {
                label: 'settings.participantJoined',
                state: soundsParticipantJoined,
                name: 'soundsParticipantJoined'
            },
            {
                label: 'settings.participantLeft',
                state: soundsParticipantLeft,
                name: 'soundsParticipantLeft'
            },
            {
                label: 'settings.talkWhileMuted',
                state: soundsTalkWhileMuted,
                name: 'soundsTalkWhileMuted'
            },
            {
                label: 'settings.participantKnocking',
                state: soundsParticipantKnocking,
                name: 'soundsParticipantKnocking'
            }
        ];

        if (!enableReactions) {
            partialSounds.shift();
        }

        return partialSounds;

    }, [ soundsReactions,
        soundsIncomingMessage,
        soundsParticipantJoined,
        soundsParticipantLeft,
        soundsTalkWhileMuted,
        soundsParticipantKnocking,
        enableReactions ]);

    const onSoundToggled = useCallback((name: string) => (enabled?: boolean) => {
        dispatch(updateSettings({ [name]: enabled }));
    }, [ dispatch, updateSettings ]);


    const onNotificationToggled = useCallback((name: string) => (enabled?: boolean) => {
        dispatch(updateSettings({
            userSelectedNotifications: {
                ...enabledNotifications,
                [name]: Boolean(enabled)
            }
        }
        )
        );
    }, [ dispatch, updateSettings, enabledNotifications ]);

    return (
        <>
            <FormSection
                label = 'settings.playSounds'
                summary = { isChinese ? '消息与参会提示音' : 'Meeting and message sounds' }>
                {
                    sounds.map(({ label, state, name, disabled }) => (
                        <FormRow
                            key = { label }
                            label = { label }>
                            <Switch
                                checked = { Boolean(state) }
                                disabled = { disabled }
                                onChange = { onSoundToggled(name) } />
                        </FormRow>
                    ))
                }
            </FormSection>
            {
                Object.keys(enabledNotifications).length > 0 && (
                    <>
                        {/* @ts-ignore */}
                        { !brandedApp && <Divider style = { styles.fieldSeparator } /> }
                        <FormSection
                            label = 'notify.displayNotifications'
                            summary = { isChinese ? '选择要显示的通知' : 'Choose visible notifications' }>
                            {
                                Object.keys(enabledNotifications).map(name => (
                                    <FormRow
                                        key = { name }
                                        label = { name }>
                                        <Switch
                                            checked = { Boolean(enabledNotifications[name]) }
                                            onChange = { onNotificationToggled(name) } />
                                    </FormRow>)
                                )
                            }
                        </FormSection>
                    </>
                )

            }
        </>
    );
};

export default NotificationsSection;
