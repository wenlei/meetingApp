import React from 'react';

import Icon from '../../base/icons/components/Icon';
import { StyleType } from '../../base/styles/functions.any';
import { ACTIVE_TAB_COLOR, INACTIVE_TAB_COLOR } from '../constants';

interface IProps {

    /**
     * Is the tab focused?
     */
    focused?: boolean;

    /**
     * The ImageSource to be rendered as image.
     */
    src: Function;

    /**
     * The component's external style.
     */
    style?: StyleType;
}

const TabIcon = ({ focused, src, style }: IProps) => (
    <Icon
        color = { focused ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR }
        size = { 24 }
        src = { src }
        style = { style } />
);


export default TabIcon;
