import { brandPalette } from '../../../../internal-account/brandPalette.native';
import BaseTheme from '../../../ui/components/BaseTheme.native';

const OVERLAY_FONT_COLOR = 'rgba(255, 255, 255, 0.6)';
const BUTTON_HEIGHT = BaseTheme.spacing[7];
const BUTTON_WIDTH = BaseTheme.spacing[7];

export const AVATAR_SIZE = 65;
export const UNDERLAY_COLOR = 'rgba(255, 255, 255, 0.2)';

const SECTION_LIST_STYLES = {
    /**
     * The style of the avatar container that makes the avatar rounded.
     */
    avatarContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 5
    },

    /**
     * Simple {@code Text} content of the avatar (the actual initials).
     */
    avatarContent: {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        color: OVERLAY_FONT_COLOR,
        fontSize: Math.floor(AVATAR_SIZE / 2),
        fontWeight: '100',
        textAlign: 'center'
    },

    /**
     * The top level container style of the list.
     */
    container: {
        flex: 1,
        width: '100%'
    },

    list: {
        flex: 1,
        flexDirection: 'column'
    },

    listContentContainer: {
        flexGrow: 1
    },

    listItem: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        marginHorizontal: BaseTheme.spacing[3],
        marginVertical: BaseTheme.spacing[2]
    },

    brandedListItem: {
        backgroundColor: brandPalette.surface,
        borderColor: brandPalette.border,
        borderRadius: 18,
        borderWidth: 1,
        marginHorizontal: 16,
        marginVertical: 6,
        paddingHorizontal: 12,
        paddingVertical: 10
    },

    listItemDetails: {
        flex: 1,
        flexDirection: 'column',
        overflow: 'hidden',
        paddingHorizontal: 5
    },

    listItemText: {
        color: OVERLAY_FONT_COLOR,
        fontSize: 14
    },

    brandedListItemText: {
        color: brandPalette.textMuted
    },

    listItemTitle: {
        fontWeight: 'bold',
        fontSize: 16
    },

    brandedListItemTitle: {
        color: brandPalette.blackMoss,
        fontSize: 17,
        fontWeight: '700'
    },

    listSection: {
        alignItems: 'center',
        backgroundColor: BaseTheme.palette.ui02,
        flex: 1,
        flexDirection: 'row',
        paddingVertical: BaseTheme.spacing[1],
        paddingHorizontal: BaseTheme.spacing[2]
    },

    listSectionText: {
        color: OVERLAY_FONT_COLOR,
        fontSize: 14,
        fontWeight: 'normal',
        marginLeft: BaseTheme.spacing[2]
    },

    brandedListSection: {
        backgroundColor: brandPalette.canvas,
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 18
    },

    brandedListSectionText: {
        color: brandPalette.blackMoss,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 0
    },

    pullToRefresh: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 20
    },

    pullToRefreshIcon: {
        backgroundColor: 'transparent',
        color: OVERLAY_FONT_COLOR,
        fontSize: 20
    },

    pullToRefreshText: {
        backgroundColor: 'transparent',
        color: OVERLAY_FONT_COLOR
    },

    brandedPullToRefreshText: {
        color: brandPalette.textMuted,
        fontSize: 15,
        lineHeight: 24,
        textAlign: 'center'
    },

    touchableView: {
        flexDirection: 'row'
    }
};

export const TINTED_VIEW_DEFAULT = {
    backgroundColor: BaseTheme.palette.uiBackground,
    opacity: 0.8
};

export const BASE_INDICATOR = {
    alignItems: 'center',
    justifyContent: 'center'
};

const iconButtonContainer = {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    borderRadius: BaseTheme.shape.borderRadius,
    height: BUTTON_HEIGHT,
    width: BUTTON_WIDTH
};

/**
 * The styles of the generic React {@code Component}s implemented by the feature
 * base/react.
 */
export default {
    ...SECTION_LIST_STYLES,

    iconButtonContainer: {
        ...iconButtonContainer
    },

    iconButtonContainerPrimary: {
        ...iconButtonContainer,
        backgroundColor: BaseTheme.palette.action01
    },

    iconButtonContainerSecondary: {
        ...iconButtonContainer,
        backgroundColor: BaseTheme.palette.action02
    },

    iconButtonContainerDisabled: {
        ...iconButtonContainer,
        backgroundColor: BaseTheme.palette.disabled01
    }
};
