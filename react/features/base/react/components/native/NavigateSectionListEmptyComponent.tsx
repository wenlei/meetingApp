import React, { Component } from 'react';
import { WithTranslation } from 'react-i18next';
import { Text, TextStyle, View, ViewStyle } from 'react-native';

import { translate } from '../../../i18n/functions.native';
import i18next from '../../../i18n/i18next';
import Icon from '../../../icons/components/Icon';
import { IconArrowDown } from '../../../icons/svg';

import styles from './styles';

/**
 * Implements a React Native {@link Component} that is to be displayed when the
 * list is empty.
 *
 * @augments Component
 */
interface IProps extends WithTranslation {
    branded?: boolean;
}

class NavigateSectionListEmptyComponent extends Component<IProps> {
    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        const { t } = this.props;
        const emptyText = this.props.branded
            ? (i18next.language?.startsWith('zh')
                ? '暂无即将开始的会议\n收到邀请后，会议信息会自动显示在这里'
                : 'No upcoming meetings\nInvitations will appear here automatically')
            : t('sectionList.pullToRefresh');

        return (
            <View style = { styles.pullToRefresh as ViewStyle }>
                <Text
                    style = { [
                        styles.pullToRefreshText,
                        this.props.branded && styles.brandedPullToRefreshText
                    ] as TextStyle[] }>
                    { emptyText }
                </Text>
                { !this.props.branded && <Icon
                    src = { IconArrowDown }
                    style = { styles.pullToRefreshIcon } /> }
            </View>
        );
    }
}

export default translate(NavigateSectionListEmptyComponent);
