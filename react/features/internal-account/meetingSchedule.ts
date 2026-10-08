/** Internal calendar values are wall-clock times in UTC+8, not device local time. */
export interface IMeetingDraft {
    attendee_ids: number[];
    date: string;
    end_time: string;
    notes: string;
    room: string;
    start_time: string;
}

export function scheduleDefaults(now = Date.now(), inMeeting = false): IMeetingDraft {
    if (inMeeting) {
        const current = new Date(now + 8 * 3600000);
        const start = Math.min(current.getUTCHours() * 60 + current.getUTCMinutes(), 1438);
        const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

        return { room: '', date: current.toISOString().slice(0, 10), start_time: format(start),
            end_time: format(Math.min(start + 60, 1439)), notes: '', attendee_ids: [] };
    }
    // Round up to the next quarter hour; move late-night defaults to tomorrow.
    const rounded = Math.ceil((now + 8 * 3600000) / 900000) * 900000;
    const date = new Date(rounded);

    if (date.getUTCHours() >= 23) {
        date.setUTCDate(date.getUTCDate() + 1);
        date.setUTCHours(9, 0, 0, 0);
    }
    const end = new Date(date.getTime() + 3600000);

    return { room: '', date: date.toISOString().slice(0, 10), start_time: date.toISOString().slice(11, 16),
        end_time: end.toISOString().slice(11, 16), notes: '', attendee_ids: [] };
}

export function meetingPayload(draft: IMeetingDraft, origin: string, generatedRoom: string, title?: string) {
    let room = draft.room.trim() || generatedRoom;

    if (room.startsWith(`${origin}/`)) {
        room = room.slice(origin.length + 1);
    }
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(room)) {
        throw new Error('invalid_room');
    }
    const parsed = new Date(`${draft.date}T00:00:00Z`);

    if (!/^20\d\d-\d{2}-\d{2}$|^2100-\d{2}-\d{2}$/.test(draft.date)
            || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.date) {
        throw new Error('invalid_date');
    }
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    if (!time.test(draft.start_time) || !time.test(draft.end_time)
            || draft.end_time <= draft.start_time) {
        throw new Error('invalid_time');
    }
    if (draft.notes.trim().length > 1000) {
        throw new Error('invalid_notes');
    }
    if (draft.attendee_ids.length > 50 || new Set(draft.attendee_ids).size !== draft.attendee_ids.length
            || draft.attendee_ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        throw new Error('invalid_attendees');
    }

    return { title: title || room, date: draft.date, start_time: draft.start_time, end_time: draft.end_time,
        notes: draft.notes.trim(), meeting_url: `${origin}/${room}`, attendee_ids: draft.attendee_ids };
}
