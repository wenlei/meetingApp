import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableHighlight, View, ViewStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import i18next, { DEFAULT_LANGUAGE } from '../../../base/i18n/i18next';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowRight } from '../../../base/icons/svg';
import { updateSettings } from '../../../base/settings/actions';
import Switch from '../../../base/ui/components/native/Switch';
import { brandPalette } from '../../../internal-account/brandPalette.native';
import { navigate } from '../../../mobile/navigation/components/settings/SettingsNavigationContainerRef';
import { screen } from '../../../mobile/navigation/routes';

import FormRow from './FormRow';
import FormSection from './FormSection';
import styles from './styles';


const GeneralSection = () => {
    const { t, i18n } = useTranslation();
    const isChinese = i18n.language?.startsWith('zh') ?? true;
    const dispatch = useDispatch();
    const {
        disableSelfView,
    } = useSelector((state: IReduxState) => state['features/base/settings']);

    const { language = DEFAULT_LANGUAGE } = i18next;

    const onSelfViewToggled = useCallback((enabled?: boolean) =>
        dispatch(updateSettings({ disableSelfView: enabled }))
    , [ dispatch, updateSettings ]);

    const navigateToLanguageSelect = useCallback(() => {
        navigate(screen.settings.language);
    }, [ navigate, screen ]);

    return (
        <FormSection
            defaultExpanded = { true }
            label = { isChinese ? '通用' : 'General' }
            summary = { isChinese ? '画面与语言' : 'Display and language' }>
            <FormRow label = 'videothumbnail.hideSelfView'>
                <Switch
                    checked = { Boolean(disableSelfView) }
                    onChange = { onSelfViewToggled } />
            </FormRow>
            <FormRow label = 'settings.language'>
                <View style = { styles.languageButtonContainer as ViewStyle }>
                    <TouchableHighlight onPress = { navigateToLanguageSelect }>
                        <View style = { styles.languageButton as ViewStyle }>
                            <Text
                                style = { [ styles.languageText, styles.brandedLanguageText ] }>{t(`languages:${language}`)}</Text>
                            <Icon
                                color = { brandPalette.blackMoss }
                                size = { 24 }
                                src = { IconArrowRight } />
                        </View>
                    </TouchableHighlight>
                </View>
            </FormRow>
        </FormSection>
    );
};

export default GeneralSection;
