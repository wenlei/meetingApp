import React from 'react';
import { WithTranslation } from 'react-i18next';
import { AppState, GestureResponderEvent, Linking, Pressable, Text, TextStyle, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { connect } from 'react-redux';

import { getDefaultURL } from '../../app/functions.native';
import { IReduxState, IStore } from '../../app/types';
import { openSheet } from '../../base/dialog/actions';
import { translate } from '../../base/i18n/functions';
import i18next from '../../base/i18n/i18next';
import Icon from '../../base/icons/components/Icon';
import { IconCalendar } from '../../base/icons/svg';
import NavigateSectionList from '../../base/react/components/native/NavigateSectionList';
import { Item, Section } from '../../base/react/types';
import { MeetingReservationCard } from '../../internal-account/MeetingSchedule.native';
import { brandPalette } from '../../internal-account/brandPalette.native';
import { IMeetingReservation, MEETING_URL, meetingReservations, subscribeAccountSession, subscribeReservations } from '../../internal-account/mobileSession.native';
import styles from '../../welcome/components/styles.native';
import { isWelcomePageEnabled } from '../../welcome/functions';
import { isRecentListEnabled, toDisplayableList } from '../functions.native';

import AbstractRecentList from './AbstractRecentList';
import RecentListItemMenu from './RecentListItemMenu.native';

/**
 * The type of the React {@code Component} props of {@link RecentList}.
 */
interface IProps extends WithTranslation {

    _brandedApp: boolean;

    /**
     * The default server URL.
     */
    _defaultServerURL: string;

    /**
     * The recent list from the Redux store.
     */
    _recentList: Array<Section>;

    /**
     * Renders the list disabled.
     */
    disabled: boolean;

    /**
     * The redux store's {@code dispatch} function.
     */
    dispatch: IStore['dispatch'];

    /**
     * Callback to be invoked when pressing the list container.
     */
    onListContainerPress?: (e?: GestureResponderEvent) => void;
}

/**
 * A class that renders the list of the recently joined rooms.
 *
 */
class RecentList extends AbstractRecentList<IProps> {
    state = { reservations: [] as IMeetingReservation[], reservationError: false };
    private unsubscribeAccount?: () => void;
    private unsubscribeReservations?: () => void;
    private reservationGeneration = 0;
    private appStateSubscription?: { remove: () => void; };
    private mounted = false;
    private reservationRefreshTimer?: ReturnType<typeof setInterval>;

    /**
     * Initializes a new {@code RecentList} instance.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onLongPress = this._onLongPress.bind(this);
        this._onPress = this._onPress.bind(this);
        this._onRefreshReservations = this._onRefreshReservations.bind(this);
    }

    override componentDidMount() {
        super.componentDidMount();
        this.mounted = true;
        if (this.props._brandedApp) {
            this.unsubscribeAccount = subscribeAccountSession(() => {
                this.reservationGeneration++;
                this.setState({ reservations: [], reservationError: false });
                this._onRefreshReservations();
            });
            this.unsubscribeReservations = subscribeReservations(this._onRefreshReservations);
            this.appStateSubscription = AppState.addEventListener('change', state => {
                if (state === 'active') {
                    this._onRefreshReservations();
                }
            });
            this.reservationRefreshTimer = setInterval(this._onRefreshReservations, 90_000);
            this._onRefreshReservations();
        }
    }

    override componentWillUnmount() {
        this.mounted = false;
        this.unsubscribeAccount?.();
        this.unsubscribeReservations?.();
        this.appStateSubscription?.remove();
        if (this.reservationRefreshTimer) {
            clearInterval(this.reservationRefreshTimer);
        }
    }

    async _onRefreshReservations() {
        const generation = ++this.reservationGeneration;

        try {
            const reservations = await meetingReservations();

            if (this.mounted && generation === this.reservationGeneration) {
                this.setState({ reservations, reservationError: false });
            }
        } catch (_) {
            // Keep the history list usable if the account service is unavailable.
            if (this.mounted && generation === this.reservationGeneration) {
                this.setState({ reservationError: true });
            }
        }
    }

    /**
     * Implements the React Components's render method.
     *
     * @inheritdoc
     */
    override render() {
        if (!isRecentListEnabled()) {
            return null;
        }
        const {
            disabled,
            onListContainerPress,
            t,
            _defaultServerURL,
            _recentList
        } = this.props; // @ts-ignore
        const recentList = toDisplayableList(_recentList, t, _defaultServerURL) as Array<Section>;
        const reservations = this.state.reservations.filter(item => item.meeting_url);

        if (this.props._brandedApp) {
            const empty = reservations.length === 0;

            recentList.unshift({
                data: empty ? [ {
                    colorBase: 'upcoming',
                    id: 'upcoming-empty',
                    key: 'upcoming-empty',
                    lines: [],
                    title: '',
                    type: 'empty',
                    url: ''
                } ] : reservations.map(item => ({
                    colorBase: item.organizer?.username || item.title,
                    id: `reservation-${item.id}`,
                    key: `reservation-${item.id}`,
                    lines: [ `${item.date}  ${item.start_time}–${item.end_time}`,
                        item.organizer ? `${item.organizer.display_name} @${item.organizer.username}` : '', '' ],
                    title: item.title,
                    type: 'meeting',
                    url: item.meeting_url
                })),
                key: 'upcoming-reservations',
                renderItem: empty ? () => (
                    <View style = { styles.brandedUpcomingEmptyCard as ViewStyle }>
                        <View style = { styles.brandedUpcomingEmptyIcon as ViewStyle }>
                            <Icon
                                color = { brandPalette.accent }
                                size = { 24 }
                                src = { IconCalendar } />
                        </View>
                        <View style = { styles.brandedUpcomingEmptyCopy as ViewStyle }>
                            <Text style = { styles.brandedUpcomingEmptyTitle as TextStyle }>
                                { this.state.reservationError ? (i18next.language?.startsWith('zh')
                                    ? '暂时无法读取日程' : 'Meetings unavailable') : i18next.language?.startsWith('zh')
                                    ? '暂无会议安排' : 'No meetings scheduled' }
                            </Text>
                            <Text style = { styles.brandedUpcomingEmptyText as TextStyle }>
                                { this.state.reservationError ? (i18next.language?.startsWith('zh')
                                    ? '请检查网络后重试，已保存的日程不会丢失'
                                    : 'Check your connection and retry. Saved meetings are not lost.') : i18next.language?.startsWith('zh')
                                    ? '收到邀请后，会议信息会自动显示在这里'
                                    : 'Invitations will appear here automatically' }
                            </Text>
                        </View>
                    </View>
                ) : (info: Object) => {
                    const { item } = info as { item: Item; };
                    const meeting = reservations.find(value => `reservation-${value.id}` === item.id);

                    return meeting ? <MeetingReservationCard
                        meeting = { meeting }
                        onJoin = { this._onPress } /> : null;
                },
                title: i18next.language?.startsWith('zh')
                    ? '近期日程' : 'Next event'
            } as Section);
        }

        return (
            <TouchableWithoutFeedback
                onPress = { onListContainerPress }>
                <View
                    style = { [
                        disabled ? styles.recentListDisabled : styles.recentList,
                        this.props._brandedApp ? styles.brandedRecentList : undefined
                    ] as ViewStyle[] }>
                    {this.state.reservationError && <Pressable
                        accessibilityRole = 'button'
                        onPress = { this._onRefreshReservations }>
                        <Text style = {{ color: brandPalette.dangerText }}>{i18next.language?.startsWith('zh')
                            ? '日程更新失败，点此重试' : 'Unable to refresh meetings. Tap to retry.'}</Text>
                    </Pressable>}
                    <NavigateSectionList
                        branded = { this.props._brandedApp }
                        disabled = { disabled }
                        onLongPress = { this._onLongPress }
                        onPress = { this._onPress }
                        onRefresh = { this._onRefreshReservations }
                        renderListEmptyComponent
                            = { this._getRenderListEmptyComponent() }

                        // @ts-ignore
                        sections = { recentList } />
                </View>
            </TouchableWithoutFeedback>
        );
    }

    /**
     * Handles the list's navigate action.
     *
     * @private
     * @param {Object} item - The item which was long pressed.
     * @returns {void}
     */
    _onLongPress(item: Item) {
        if (String(item.id).startsWith('reservation-')) {
            return;
        }
        this.props.dispatch(openSheet(RecentListItemMenu, { item }));
    }

    override _onPress(url: string) {
        if (this.props._brandedApp && !url.startsWith(`${MEETING_URL}/`)) {
            Linking.openURL(url).catch(() => undefined);

            return;
        }
        super._onPress(url);
    }
}

/**
 * Maps redux state to component props.
 *
 * @param {Object} state - The redux state.
 * @returns {IProps}
 */
export function _mapStateToProps(state: IReduxState) {
    return {
        _defaultServerURL: getDefaultURL(state),
        _brandedApp: isWelcomePageEnabled(state),
        _recentList: state['features/recent-list']
    };
}

// @ts-ignore
export default translate(connect(_mapStateToProps)(RecentList));
