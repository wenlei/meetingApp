import { appNavigate } from '../app/actions.native';
import { KICKED_OUT } from '../base/conference/actionTypes';
import { conferenceLeft } from '../base/conference/actions.native';
import { disconnect } from '../base/connection/actions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { notifyKickedOut } from './actions.native';

import './middleware.any';

MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case KICKED_OUT: {
        const { dispatch } = store;

        if (action.deviceTransferred === true) {
            // Close the old transport immediately, before asking the user to
            // acknowledge the result. Show the notice on the welcome screen.
            const result = next(action);

            void dispatch(disconnect()).then(() => dispatch(appNavigate(undefined))).then(() => {
                dispatch(notifyKickedOut(undefined, undefined, true));
            });

            return result;
        }

        dispatch(notifyKickedOut(
          action.participant,
          () => {
              dispatch(conferenceLeft(action.conference));
              dispatch(appNavigate(undefined));
          }
        ));

        break;
    }
    }

    return next(action);
});
