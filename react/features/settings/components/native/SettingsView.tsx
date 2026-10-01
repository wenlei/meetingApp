import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    Text,
    TextStyle,
    TouchableHighlight,
    UIManager,
    View,
    ViewStyle
} from 'react-native';
import { Divider } from 'react-native-paper';
import { Edge } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import Avatar from '../../../base/avatar/components/Avatar';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowRight } from '../../../base/icons/svg';
import JitsiScreen from '../../../base/modal/components/JitsiScreen';
import { getLocalParticipant } from '../../../base/participants/functions';
import InternalAccountSettings from '../../../internal-account/InternalAccountSettings.native';
import InternalCurrentAccountLabel from '../../../internal-account/InternalCurrentAccountLabel.native';
import MacWindowCard from '../../../internal-account/MacWindowCard.native';
import { brandPalette } from '../../../internal-account/brandPalette.native';
import { navigate } from '../../../mobile/navigation/components/settings/SettingsNavigationContainerRef';
import { screen } from '../../../mobile/navigation/routes';
import { isWelcomePageEnabled } from '../../../welcome/functions';
import { shouldShowModeratorSettings } from '../../functions.native';

import AdvancedSection from './AdvancedSection';
import ConferenceSection from './ConferenceSection';
import { SettingsAccordionContext } from './FormSection';
import GeneralSection from './GeneralSection';
import LinksSection from './LinksSection';
import ModeratorSection from './ModeratorSection';
import NotificationsSection from './NotificationsSection';
import { AVATAR_SIZE } from './constants';
import styles from './styles';


interface IProps {

    isInWelcomePage?: boolean | undefined;
}

const SettingsView = ({ isInWelcomePage }: IProps) => {
    const { i18n } = useTranslation();

    React.useEffect(() => {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }, []);
    const { displayName } = useSelector((state: IReduxState) => state['features/base/settings']);
    const localParticipant = useSelector((state: IReduxState) => getLocalParticipant(state));
    const showModeratorSettings = useSelector((state: IReduxState) => shouldShowModeratorSettings(state));
    const brandedApp = useSelector(isWelcomePageEnabled);
    const { visible } = useSelector((state: IReduxState) => state['features/settings']);

    const addBottomInset = !isInWelcomePage;
    const localParticipantId = localParticipant?.id;
    const scrollBounces = Boolean(isInWelcomePage);

    if (visible !== undefined && !visible) {
        return null;
    }

    const profileContent = (
        <TouchableHighlight
            /* eslint-disable react/jsx-no-bind */
            onPress = { () => navigate(screen.settings.profile) }
            underlayColor = { brandedApp ? brandPalette.surfaceMuted : undefined }>
            <View
                style = { [ styles.profileContainer,
                    brandedApp && styles.brandedProfileContainer,
                    brandedApp && styles.windowProfileContent ] as ViewStyle[] }>
                { brandedApp
                    ? <InternalCurrentAccountLabel />
                    : <>
                        <Avatar
                            participantId = { localParticipantId }
                            size = { AVATAR_SIZE } />
                        <Text style = { styles.displayName as TextStyle }>{ displayName }</Text>
                    </> }
                <Icon
                    color = { brandedApp ? brandPalette.blackMoss : undefined }
                    size = { 24 }
                    src = { IconArrowRight }
                    style = { styles.profileViewArrow } />
            </View>
        </TouchableHighlight>
    );

    return (
        <JitsiScreen
            disableForcedKeyboardDismiss = { true }
            safeAreaInsets = { [ addBottomInset && 'bottom', 'left', 'right' ].filter(Boolean) as Edge[] }
            style = { brandedApp ? styles.brandedSettingsViewContainer : styles.settingsViewContainer }>
            <ScrollView bounces = { scrollBounces }>
                <View style = { styles.profileContainerWrapper as ViewStyle }>
                    {brandedApp ? <MacWindowCard
                        title = { i18n.language?.startsWith('zh') ? '当前账号' : 'Current account' }>
                        { profileContent }
                    </MacWindowCard> : profileContent}
                </View>
                <SettingsAccordionContext.Provider value = { brandedApp }>
                    <GeneralSection />
                    { isInWelcomePage && <>
                        { !brandedApp && <Divider style = { styles.fieldSeparator as ViewStyle } /> }
                        <ConferenceSection />
                    </> }
                    { !brandedApp && <Divider style = { styles.fieldSeparator as ViewStyle } /> }
                    <NotificationsSection />

                    { showModeratorSettings
                        && <>
                            { !brandedApp && <Divider style = { styles.fieldSeparator as ViewStyle } /> }
                            <ModeratorSection />
                        </> }
                    { !brandedApp && <Divider style = { styles.fieldSeparator as ViewStyle } /> }
                    <AdvancedSection />
                    { !brandedApp && <>
                        <Divider style = { styles.fieldSeparator as ViewStyle } />
                        <LinksSection />
                    </> }
                    { brandedApp && <InternalAccountSettings /> }
                </SettingsAccordionContext.Provider>
            </ScrollView>
        </JitsiScreen>
    );
};

export default SettingsView;
