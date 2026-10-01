import BaseTheme from '../../../base/ui/components/BaseTheme.native';
import { brandAlpha, brandPalette } from '../../../internal-account/brandPalette.native';

export const ANDROID_UNDERLINE_COLOR = 'transparent';
export const PLACEHOLDER_COLOR = BaseTheme.palette.focus01;

/**
 * The styles of the native components of the feature {@code settings}.
 */
export default {

    windowSection: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 4
    },

    windowProfileContent: {
        borderWidth: 0,
        borderRadius: 0,
        shadowOpacity: 0
    },

    profileContainerWrapper: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8
    },

    profileContainer: {
        backgroundColor: BaseTheme.palette.ui02,
        borderRadius: BaseTheme.shape.borderRadius,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        padding: BaseTheme.spacing[3]
    },

    brandedProfileContainer: {
        backgroundColor: brandPalette.surface,
        borderColor: brandPalette.border,
        borderRadius: 20,
        borderWidth: 1,
        minHeight: 82,
        paddingHorizontal: 18,
        paddingVertical: 14,
        shadowColor: brandPalette.shadow,
        shadowOffset: { height: 8, width: 0 },
        shadowOpacity: 0.04,
        shadowRadius: 16
    },

    brandedSection: {
        backgroundColor: brandPalette.surface,
        borderColor: brandPalette.border,
        borderRadius: 18,
        borderWidth: 1,
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 4,
        overflow: 'hidden' as const
    },

    brandedSectionExpanded: {
        borderColor: brandPalette.border,
        backgroundColor: brandPalette.surface
    },

    accordionTrigger: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 62,
        paddingHorizontal: 18,
        paddingVertical: 11
    },

    accordionHeading: {
        flex: 1,
        paddingRight: 12
    },

    accordionTitle: {
        color: brandPalette.blackMoss,
        fontSize: 16,
        fontWeight: '700' as const
    },

    accordionSummary: {
        color: brandPalette.textMuted,
        fontSize: 12,
        marginTop: 3
    },

    accordionChevron: {
        alignItems: 'center',
        backgroundColor: brandPalette.surfaceMuted,
        borderRadius: 16,
        height: 32,
        justifyContent: 'center',
        width: 32
    },

    accordionChevronExpanded: {
        backgroundColor: brandPalette.surfaceMuted
    },

    accordionChevronText: {
        color: brandPalette.blackMoss,
        fontSize: 22,
        fontWeight: '500' as const,
        lineHeight: 27
    },

    accordionPanel: {
        borderTopColor: brandAlpha.border,
        borderTopWidth: 1,
        paddingBottom: 4
    },

    rowSeparator: {
        backgroundColor: brandAlpha.border,
        height: 1
    },

    brandedSectionTitle: {
        color: brandPalette.teaLeaf,
        fontSize: 12,
        fontWeight: '700' as const,
        letterSpacing: 0.8,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4
    },

    profileView: {
        flexGrow: 1,
        flexDirection: 'column',
        justifyContent: 'space-between'
    },

    applyProfileSettingsButton: {
        marginHorizontal: BaseTheme.spacing[4],
        marginVertical: BaseTheme.spacing[3]
    },

    avatarContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        padding: BaseTheme.spacing[3],
        margin: BaseTheme.spacing[4]
    },

    gavatarMessageContainer: {
        marginHorizontal: BaseTheme.spacing[4],
        color: BaseTheme.palette.text02,
        marginTop: -BaseTheme.spacing[2],
        ...BaseTheme.typography.bodyShortRegular
    },

    displayName: {
        ...BaseTheme.typography.bodyLongRegularLarge,
        color: BaseTheme.palette.text01,
        marginLeft: BaseTheme.spacing[3],
        position: 'relative'
    },

    profileViewArrow: {
        position: 'absolute',
        right: 16
    },

    /**
     * Style for screen container.
     */
    settingsViewContainer: {
        backgroundColor: BaseTheme.palette.ui01,
        flex: 1
    },

    brandedSettingsViewContainer: {
        backgroundColor: brandPalette.canvas,
        flex: 1
    },

    /**
     * Standardized style for a field container {@code View}.
     */
    fieldContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        minHeight: 52,
        paddingHorizontal: 12,
        justifyContent: 'space-between'
    },

    /**
     * * Appended style for column layout fields.
     */
    fieldContainerColumn: {
        alignItems: 'flex-start',
        flexDirection: 'column'
    },

    /**
     * Standard container for a {@code View} containing a field label.
     */
    fieldLabelContainer: {
        alignItems: 'center',
        flexShrink: 1,
        flexDirection: 'row',
        paddingLeft: BaseTheme.spacing[3],
        paddingRight: BaseTheme.spacing[1]
    },

    /**
     * Text of the field labels on the form.
     */
    fieldLabelText: {
        fontSize: 14,
        fontWeight: '500' as const
    },

    brandedFieldLabelText: {
        color: brandPalette.blackMoss
    },

    /**
     * Field container style for all but last row {@code View}.
     */
    fieldSeparator: {
        marginHorizontal: BaseTheme.spacing[4],
        borderBottomWidth: 1,
        borderColor: BaseTheme.palette.ui05,
        marginVertical: 4
    },

    /**
     * Style for the {@code View} containing each
     * field values (the actual field).
     */
    fieldValueContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 1,
        justifyContent: 'flex-end',
        paddingRight: BaseTheme.spacing[3]
    },

    /**
     * Style for the form section separator titles.
     */

    formSectionTitleContent: {
        backgroundColor: BaseTheme.palette.ui02,
        paddingVertical: BaseTheme.spacing[1]
    },

    formSectionTitleText: {
        ...BaseTheme.typography.bodyShortBold,
        color: BaseTheme.palette.text02,
        marginHorizontal: BaseTheme.spacing[4],
        marginVertical: BaseTheme.spacing[2]
    },

    /**
     * Global {@code Text} color for the components.
     */
    text: {
        color: BaseTheme.palette.text01
    },

    /**
     * Text input container style.
     */
    customContainer: {
        marginBottom: BaseTheme.spacing[3],
        marginHorizontal: BaseTheme.spacing[4],
        marginTop: BaseTheme.spacing[2]
    },

    languageButtonContainer: {
        borderRadius: BaseTheme.shape.borderRadius,
        overflow: 'hidden'
    },

    languageButton: {
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'row',
        height: BaseTheme.spacing[7],
        justifyContent: 'center'
    },

    languageOption: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: BaseTheme.spacing[6],
        marginHorizontal: BaseTheme.spacing[4],
        borderBottomWidth: 1,
        borderColor: BaseTheme.palette.ui05
    },

    selectedLanguage: {
        color: BaseTheme.palette.text03
    },

    languageText: {
        ...BaseTheme.typography.bodyShortRegularLarge,
        color: BaseTheme.palette.text01,
        marginHorizontal: BaseTheme.spacing[2]
    },

    brandedLanguageText: {
        color: brandPalette.blackMoss
    },

    /**
     * Standard text input field style.
     */
    textInputField: {
        color: BaseTheme.palette.field01,
        flex: 1,
        ...BaseTheme.typography.bodyShortRegularLarge,
        textAlign: 'right'
    },

    /**
     * Appended style for column layout fields.
     */
    textInputFieldColumn: {
        backgroundColor: 'rgb(245, 245, 245)',
        borderRadius: 8,
        marginVertical: 5,
        paddingVertical: 3,
        textAlign: 'left'
    },

    /**
     * Style for screen container.
     */
    screenContainer: {
        flex: 1
    },

    linksSection: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        marginHorizontal: BaseTheme.spacing[3]
    },

    linksButton: {
        width: '33%',
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        ...BaseTheme.typography.bodyShortBoldLarge
    },

    logBtn: {
        marginRight: BaseTheme.spacing[3]
    },

    backBtn: {
        marginLeft: BaseTheme.spacing[3]
    }
};
