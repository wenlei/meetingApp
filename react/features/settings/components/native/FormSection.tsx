import React, { createContext, useContext } from 'react';
import { WithTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';

import { translate } from '../../../base/i18n/functions';
import MacWindowCard from '../../../internal-account/MacWindowCard.native';
import { isWelcomePageEnabled } from '../../../welcome/functions';

import FormRow from './FormRow';
import styles from './styles';


/**
 * The type of the React {@code Component} props of {@link FormSection}.
 */
interface IProps extends WithTranslation {

    /**
     * The children to be displayed within this Link.
     */
    children: React.ReactNode;

    /** The section initially visible in the branded settings screen. */
    defaultExpanded?: boolean;

    /**
     * The i18n key of the text label of the section.
     */
    label?: string;

    /** Short explanation shown when the section is folded. */
    summary?: string;
}

/** Only the main settings screen uses the accordion layout. */
export const SettingsAccordionContext = createContext(false);

/**
 * Section accordion on settings form.
 *
 * @returns {React$Element<any>}
 */
function FormSection({ children, defaultExpanded = false, label, summary, t }: IProps) {
    const brandedApp = useSelector(isWelcomePageEnabled);
    const inSettingsAccordion = useContext(SettingsAccordionContext);
    const accordion = brandedApp && inSettingsAccordion && Boolean(label);
    let rows = 0;
    const sectionChildren = React.Children.toArray(children).map(child => {
        if (!React.isValidElement(child) || child.type !== FormRow) {
            return child;
        }
        const needsSeparator = rows++ > 0;

        return (
            <React.Fragment key = { child.key }>
                { needsSeparator && <View style = { styles.rowSeparator } /> }
                { child }
            </React.Fragment>
        );
    });

    if (brandedApp && label) {
        return (
            <MacWindowCard
                defaultExpanded = { accordion ? defaultExpanded : true }
                style = { styles.windowSection }
                summary = { summary }
                title = { t(label) }>
                { sectionChildren }
            </MacWindowCard>
        );
    }

    return (
        <View style = { brandedApp ? styles.brandedSection : undefined }>
            {label && <Text style = { brandedApp ? styles.brandedSectionTitle : styles.formSectionTitleText }>
                { t(label) }
            </Text>}
            { brandedApp ? sectionChildren : children }
        </View>
    );
}

export default translate(FormSection);
