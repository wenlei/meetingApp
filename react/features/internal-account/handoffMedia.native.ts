interface ITrack {
    isMuted: () => boolean;
    mute: () => Promise<unknown>;
    unmute: () => Promise<unknown>;
}

interface IConference {
    getLocalTracks: () => ITrack[];
    getName: () => string;
    isConnectionInterrupted?: () => boolean;
}

interface IPending {
    cancel: () => Promise<unknown>;
    commit: () => Promise<unknown>;
    committing?: boolean;
    conference?: IConference;
    error: () => void;
    muted?: Promise<unknown>;
    ready?: IConference;
    restore?: ITrack[];
    room: string;
}

let pending: IPending | undefined;

export function registerMediaHandoff(value: IPending) {
    if (pending) {
        pending.cancel().catch(() => undefined);
    }
    pending = value;
}

async function finish(value: IPending) {
    if (pending !== value || value.committing || !value.conference || value.ready !== value.conference
        || value.conference.isConnectionInterrupted?.()) {
        return;
    }
    value.committing = true;
    try {
        await value.muted;
        if (pending !== value) {
            return;
        }
        await value.commit();
        if (pending === value) {
            pending = undefined;
            await Promise.all((value.restore || []).map(track => track.unmute()));
        }
    } catch (_) {
        // Do not sign out or destroy the conference. The server expires only
        // the provisional endpoint if ready was never committed.
        value.error();
        value.committing = false;
    }
}

export function handoffConferenceJoined(conference: IConference) {
    const value = pending;

    if (!value || value.conference === conference || value.room.toLowerCase() !== conference.getName().toLowerCase()) {
        return;
    }
    value.conference = conference;
    value.restore = conference.getLocalTracks().filter(track => !track.isMuted());
    value.muted = Promise.all(value.restore.map(track => track.mute()));
    value.muted.catch(() => value.error());
    void finish(value);
}

export function handoffMediaReady(conference: IConference) {
    const value = pending;

    if (value && value.room.toLowerCase() === conference.getName().toLowerCase()) {
        value.ready = conference;
        void finish(value);
    }
}

export function handoffConferenceLeft(conference?: IConference) {
    if (pending && (!conference || pending.room.toLowerCase() === conference.getName().toLowerCase())) {
        const value = pending;

        pending = undefined;
        value.cancel().catch(() => undefined);
    }
}
