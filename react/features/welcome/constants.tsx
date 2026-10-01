import React from 'react';

import { IconCalendar, IconGear, IconRestore } from '../base/icons/svg';
import { brandPalette } from '../internal-account/brandPalette.native';

import TabIcon from './components/TabIcon';

export const ACTIVE_TAB_COLOR = brandPalette.blackMoss;
export const INACTIVE_TAB_COLOR = brandPalette.textMuted;

export const tabBarOptions = {
    tabBarActiveTintColor: ACTIVE_TAB_COLOR,
    tabBarInactiveTintColor: INACTIVE_TAB_COLOR,
    tabBarLabelStyle: {
        fontSize: 12,
    },
    tabBarStyle: {
        backgroundColor: brandPalette.surface,
        borderTopColor: brandPalette.border
    }
};

export const recentListTabBarOptions = {
    tabBarIcon: ({ focused }: { focused: boolean; }) => (
        <TabIcon
            focused = { focused }
            src = { IconRestore } />
    )
};

export const calendarListTabBarOptions = {
    tabBarIcon: ({ focused }: { focused: boolean; }) => (
        <TabIcon
            focused = { focused }
            src = { IconCalendar } />
    )
};

export const settingsTabBarOptions = {
    tabBarIcon: ({ focused }: { focused: boolean; }) => (
        <TabIcon
            focused = { focused }
            src = { IconGear } />
    )
};
