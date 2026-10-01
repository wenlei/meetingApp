import React, { Component } from 'react';
import { TextStyle } from 'react-native';

import { SectionListSection } from '../../types';

import Container from './Container';
import Text from './Text';
import styles from './styles';

interface IProps {

    /** Uses the Guangyu shell section treatment. */
    branded?: boolean;

    /**
     * A section containing the data to be rendered.
     */
    section: SectionListSection;
}

/**
 * Implements a React/Native {@link Component} that renders the section header
 * of the list.
 *
 * @augments Component
 */
export default class NavigateSectionListSectionHeader extends Component<IProps> {
    /**
     * Renders the content of this component.
     *
     * @returns {ReactElement}
     */
    override render() {
        const { branded } = this.props;
        const { section } = this.props.section;

        return (
            <Container
                style = { [
                    styles.listSection,
                    branded ? styles.brandedListSection : {}
                ] }>
                <Text
                    style = { [
                        styles.listSectionText,
                        branded && styles.brandedListSectionText
                    ] as TextStyle[] }>
                    { section.title }
                </Text>
            </Container>
        );
    }
}
