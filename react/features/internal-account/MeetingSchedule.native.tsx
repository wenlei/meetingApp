/* eslint-disable react/jsx-no-bind, react/no-multi-comp */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal, NativeModules,
    Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuid } from 'uuid';

import Icon from '../base/icons/components/Icon';
import { IconCalendar, IconCheck, IconCloseLarge } from '../base/icons/svg';

import { brandPalette as colors } from './brandPalette.native';
import { IMeetingDraft, meetingPayload, scheduleDefaults } from './meetingSchedule';
import {
    IAccountUser, IMeetingReservation, MEETING_URL, cancelMeeting, meetingDirectory, meetingReservations, saveMeeting
} from './mobileSession.native';

const s = StyleSheet.create({
    entry: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 44 },
    entryText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 56 },
    heading: { color: colors.blackMoss, fontSize: 20, fontWeight: '700', flex: 1 },
    close: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
    content: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
    label: { color: colors.blackMoss, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
    field: { color: colors.blackMoss, backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1,
        borderRadius: 10, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
    row: { flexDirection: 'row', gap: 12 },
    grow: { flex: 1 },
    person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 48 },
    divider: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    name: { color: colors.blackMoss, fontSize: 14, fontWeight: '600' },
    check: { height: 22, width: 22, borderWidth: 1, borderColor: colors.accent, borderRadius: 6 },
    checked: { backgroundColor: colors.accent },
    people: { maxHeight: 230 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: 10, minHeight: 40 },
    button: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 48, paddingHorizontal: 16, backgroundColor: colors.accent },
    buttonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
    danger: { backgroundColor: colors.dangerSurface },
    dangerText: { color: colors.dangerText },
    error: { color: colors.dangerText, fontSize: 13, lineHeight: 19 },
    disabled: { opacity: 0.5 },
    summary: { padding: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, marginBottom: 10 }
});

const errorCopy: Record<string, [string, string]> = {
    invalid_room: [ '会议室名称须为 6–64 位英文字母、数字、- 或 _；也可填写本系统邀请链接。', 'Use 6–64 letters, digits, - or _, or an internal meeting link.' ],
    invalid_date: [ '请选择有效日期。', 'Choose a valid date.' ],
    invalid_time: [ '结束时间须晚于开始时间（同一天）。', 'End time must be after start time on the same day.' ],
    invalid_notes: [ '备注最多 1000 字。', 'Notes may contain up to 1,000 characters.' ],
    invalid_attendees: [ '最多邀请 50 位有效账号，请刷新名单后重试。', 'Select up to 50 active accounts. Refresh the directory and retry.' ],
    authentication_required: [ '登录状态已变化，请重新登录。', 'Your session changed. Please log in again.' ],
    event_unavailable: [ '该日程已删除或你没有修改权限，请关闭后刷新。', 'This event was removed or cannot be edited. Close and refresh.' ],
    save_uncertain: [ '未收到保存结果。请关闭并刷新近期日程确认，避免重复创建。', 'Save result not received. Close and refresh upcoming meetings before trying again.' ],
    network_error: [ '暂时无法连接账号服务，请重试。', 'Cannot reach the account service. Please retry.' ],
    picker_error: [ '无法打开日期或时间选择器，请关闭日程后重试。', 'Cannot open the date/time picker. Close this form and try again.' ]
};

// Entry for scheduled meetings and adding an existing room to account calendars.
export default function MeetingScheduleButton({ room = '', inMeeting = false }: { inMeeting?: boolean; room?: string; }) {
    const { i18n } = useTranslation();
    const zh = Boolean(i18n.language?.startsWith('zh'));
    const [ open, setOpen ] = useState(false);
    const [ event, setEvent ] = useState<IMeetingReservation | undefined>();
    const [ loading, setLoading ] = useState(false);
    const [ failed, setFailed ] = useState(false);
    const opening = useRef(false);
    const show = async () => {
        if (opening.current) {
            return;
        }
        opening.current = true;
        setLoading(true);
        setFailed(false);
        try {
            if (inMeeting) {
                const now = new Date(Date.now() + 8 * 3600000).toISOString();
                const matches = (await meetingReservations()).filter(item => item.meeting_room?.toLowerCase() === room.toLowerCase());
                const active = matches.filter(item => item.date === now.slice(0, 10)
                    && item.start_time <= now.slice(11, 16) && item.end_time >= now.slice(11, 16));

                // Reuse today's active booking, or the next one when joining early.
                setEvent(active.find(item => item.can_edit) || active[0] || matches[0]);
            }
            setOpen(true);
        } catch (_) {
            setFailed(true);
        } finally {
            opening.current = false;
            setLoading(false);
        }
    };

    return (<>
        <Pressable
            accessibilityRole = 'button'
            disabled = { loading }
            onPress = { show }
            style = { s.entry }>
            <Icon
                color = { colors.accent }
                size = { 20 }
                src = { IconCalendar } />
            <Text style = { s.entryText }>{inMeeting ? (zh ? '邀请账号 · 同步日程' : 'Invite accounts · Calendar')
                : (zh ? '安排会议 · 邀请参会者' : 'Schedule · Invite people')}</Text>
            {loading && <ActivityIndicator color = { colors.accent } />}
        </Pressable>
        {failed && <Text style = { s.error }>{zh ? '日程读取失败，请重试' : 'Unable to load meetings. Please retry.'}</Text>}
        {open && <MeetingScheduleDialog
            event = { event }
            inMeeting = { inMeeting }
            onClose = { () => setOpen(false) }
            room = { room } />}
    </>);
}

// A visible details affordance, separate from the join action.
export function MeetingReservationCard({ meeting, onJoin }: { meeting: IMeetingReservation; onJoin: (url: string) => void; }) {
    const { i18n } = useTranslation();
    const zh = Boolean(i18n.language?.startsWith('zh'));
    const [ open, setOpen ] = useState(false);

    return (<View style = { s.summary }>
        <Pressable
            accessibilityRole = 'button'
            onPress = { () => setOpen(true) }>
            <Text style = { s.name }>{meeting.title}</Text>
            <Text style = { s.hint }>{meeting.date}  {meeting.start_time}–{meeting.end_time} · UTC+8</Text>
            {meeting.organizer && <Text style = { s.hint }>{meeting.organizer.display_name} @{meeting.organizer.username}</Text>}
        </Pressable>
        <View style = { s.row }>
            <Pressable
                accessibilityRole = 'button'
                onPress = { () => setOpen(true) }
                style = { [ s.entry, s.grow ] }>
                <Text style = { s.entryText }>{meeting.can_edit ? (zh ? '编辑 / 邀请' : 'Edit / Invite') : (zh ? '查看邀请' : 'View invitation')}</Text>
            </Pressable>
            <Pressable
                accessibilityRole = 'button'
                onPress = { () => onJoin(meeting.meeting_url) }
                style = { s.entry }>
                <Text style = { s.entryText }>{zh ? '加入会议' : 'Join meeting'}</Text>
            </Pressable>
        </View>
        {open && <MeetingScheduleDialog
            event = { meeting }
            onClose = { () => setOpen(false) } />}
    </View>);
}

function MeetingScheduleDialog({ event, onClose, room = '', inMeeting = false }: {
    event?: IMeetingReservation; inMeeting?: boolean; onClose: () => void; room?: string;
}) {
    const { i18n } = useTranslation();
    const zh = Boolean(i18n.language?.startsWith('zh'));
    const editable = !event || event.can_edit;
    const [ draft, setDraft ] = useState<IMeetingDraft>(() => event
        ? { room: event.meeting_room, date: event.date, start_time: event.start_time, end_time: event.end_time,
            notes: event.notes || '', attendee_ids: (event.attendees || []).map(user => user.id) }
        : { ...scheduleDefaults(Date.now(), inMeeting), room });
    const [ directory, setDirectory ] = useState<IAccountUser[]>([]);
    const [ loading, setLoading ] = useState(editable);
    const [ directoryFailed, setDirectoryFailed ] = useState(false);
    const [ reload, setReload ] = useState(0);
    const [ query, setQuery ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState('');
    const locked = useRef(false);
    const picking = useRef(false);
    const [ generatedRoom ] = useState(() => `Meeting${uuid().replace(/-/g, '')}`);
    const blocked = busy || error === 'save_uncertain';
    const copy = (cn: string, en: string) => zh ? cn : en;
    const change = <K extends keyof IMeetingDraft>(key: K, value: IMeetingDraft[K]) => setDraft(old => ({ ...old, [key]: value }));

    useEffect(() => {
        if (!editable) {
            return;
        }
        let active = true;

        setLoading(true);
        setDirectoryFailed(false);
        meetingDirectory().then(users => {
            if (active) {
                setDirectory(users);
            }
        }).catch(() => {
            if (active) {
                setDirectoryFailed(true);
            }
        }).finally(() => {
            if (active) {
                setLoading(false);
            }
        });

        return () => {
            active = false;
        };
    }, [ editable, reload ]);

    const close = () => {
        if (!locked.current) {
            onClose();
        }
    };
    const submit = async (remove = false) => {
        if (locked.current || blocked || !editable) {
            return;
        }
        locked.current = true;
        setBusy(true);
        setError('');
        try {
            if (remove && event) {
                await cancelMeeting(event);
            } else {
                await saveMeeting(meetingPayload(draft, MEETING_URL, generatedRoom, event?.title), event);
            }
            onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'network_error');
        } finally {
            locked.current = false;
            setBusy(false);
        }
    };
    const pick = async (key: 'date' | 'start_time' | 'end_time') => {
        if (picking.current) {
            return;
        }
        picking.current = true;
        try {
            const value = await NativeModules.MeetingDateTime.pick(key === 'date' ? 'date' : 'time', draft[key]);

            if (value) {
                change(key, value);
            }
        } catch (_) {
            setError('picker_error');
        } finally {
            picking.current = false;
        }
    };
    const timeField = (key: 'date' | 'start_time' | 'end_time', label: string) => (<View style = { s.grow }>
        <Text style = { s.label }>{label}</Text>
        {Platform.OS === 'android' && editable ? <Pressable
            accessibilityLabel = { label }
            accessibilityRole = 'button'
            disabled = { blocked }
            onPress = { () => pick(key) }
            style = { s.field }>
            <Text style = { s.name }>{draft[key]}</Text>
        </Pressable> : <TextInput
            accessibilityLabel = { label }
            editable = { editable && !blocked }
            onChangeText = { value => change(key, value) }
            style = { s.field }
            value = { draft[key] } />}
    </View>);
    const users = Array.from(new Map([ ...(event?.attendees || []), ...directory ].map(user => [ user.id, user ])).values());
    const visible = users.filter(user => `${user.display_name} @${user.username}`.toLowerCase().includes(query.trim().toLowerCase()));
    const toggle = (id: number) => {
        if (draft.attendee_ids.includes(id)) {
            change('attendee_ids', draft.attendee_ids.filter(value => value !== id));
        } else if (draft.attendee_ids.length < 50) {
            change('attendee_ids', [ ...draft.attendee_ids, id ]);
        } else {
            setError('invalid_attendees');
        }
    };

    return (<Modal
        animationType = 'slide'
        onRequestClose = { close }
        visible = { true }>
        <SafeAreaView style = { s.screen }>
            <View style = { s.header }>
                <Text style = { s.heading }>{event ? copy('会议日程', 'Meeting details') : copy('安排会议', 'Schedule a meeting')}</Text>
                <Pressable
                    accessibilityLabel = { copy('关闭', 'Close') }
                    accessibilityRole = 'button'
                    disabled = { busy }
                    onPress = { close }
                    style = { s.close }>
                    <Icon
                        color = { colors.blackMoss }
                        size = { 22 }
                        src = { IconCloseLarge } />
                </Pressable>
            </View>
            <KeyboardAvoidingView
                behavior = { Platform.OS === 'ios' ? 'padding' : undefined }
                style = { s.grow }>
                <ScrollView
                    contentContainerStyle = { s.content }
                    keyboardShouldPersistTaps = 'handled'>
                    <Text style = { s.hint }>{copy('保存后同步到参会者的个人日程。时间均为北京时间（UTC+8）。', 'Saved to each attendee’s account calendar. All times are Beijing time (UTC+8).')}</Text>
                    <View style = { s.card }>
                        {event && <Text style = { s.name }>{event.title}</Text>}
                        <View>
                            <Text style = { s.label }>{copy('会议室名称或邀请链接', 'Room name or invitation link')}</Text>
                            <TextInput
                                accessibilityLabel = { copy('会议室名称或邀请链接', 'Room name or invitation link') }
                                autoCapitalize = 'none'
                                editable = { !event && !inMeeting && !blocked }
                                maxLength = { 2048 }
                                onChangeText = { value => change('room', value) }
                                placeholder = { copy('留空自动随机命名', 'Leave blank for a random name') }
                                placeholderTextColor = { colors.textMuted }
                                style = { s.field }
                                value = { draft.room } />
                            <Text style = { s.hint }>{copy('6–64 位英文字母、数字、- 或 _。保存后链接不变。', '6–64 letters, digits, - or _. Saved links stay unchanged.')}</Text>
                        </View>
                        {timeField('date', copy('日期', 'Date'))}
                        <View style = { s.row }>{timeField('start_time', copy('开始', 'Start'))}{timeField('end_time', copy('结束', 'End'))}</View>
                    </View>
                    <View style = { s.card }>
                        <Text style = { s.label }>{copy('参会者', 'Attendees')} · {draft.attendee_ids.length}/50</Text>
                        {editable && <TextInput
                            accessibilityLabel = { copy('搜索参会者', 'Search attendees') }
                            editable = { !blocked }
                            onChangeText = { setQuery }
                            placeholder = { copy('搜索姓名或 @用户名', 'Search name or @username') }
                            placeholderTextColor = { colors.textMuted }
                            style = { s.field }
                            value = { query } />}
                        <View style = { s.chips }>{users.filter(user => draft.attendee_ids.includes(user.id)).map(user =>
                            (<Pressable
                                accessibilityLabel = { `${copy('移除', 'Remove')} @${user.username}` }
                                accessibilityRole = 'button'
                                disabled = { !editable || blocked }
                                key = { user.id }
                                onPress = { () => toggle(user.id) }
                                style = { s.chip }>
                                <Text style = { s.name }>@{user.username}</Text>
                            </Pressable>))}</View>
                        {loading ? <ActivityIndicator color = { colors.accent } /> : directoryFailed ? <Pressable onPress = { () => setReload(reload + 1) }>
                            <Text style = { s.error }>{copy('名单加载失败，点此重试', 'Directory unavailable. Tap to retry.')}</Text>
                        </Pressable> : editable && <ScrollView
                            keyboardShouldPersistTaps = 'handled'
                            nestedScrollEnabled = { true }
                            style = { s.people }>
                            {visible.map((user, index) => (<Pressable
                                accessibilityRole = 'checkbox'
                                accessibilityState = {{ checked: draft.attendee_ids.includes(user.id), disabled: blocked }}
                                disabled = { blocked }
                                key = { user.id }
                                onPress = { () => toggle(user.id) }
                                style = { [ s.person, index < visible.length - 1 && s.divider ] }>
                                <View style = { [ s.check, draft.attendee_ids.includes(user.id) && s.checked ] }>
                                    {draft.attendee_ids.includes(user.id) && <Icon
                                        color = { colors.white }
                                        size = { 20 }
                                        src = { IconCheck } />}
                                </View>
                                <View style = { s.grow }><Text style = { s.name }>{user.display_name}</Text><Text style = { s.hint }>@{user.username}</Text></View>
                            </Pressable>))}
                            {!visible.length && <Text style = { s.hint }>{copy('没有匹配的账号', 'No matching accounts')}</Text>}
                        </ScrollView>}
                        <Text style = { s.hint }>{editable
                            ? copy('你作为组织者自动加入；受邀者不会自动进入通话，也不会获得主持权限。', 'You are included as organizer. Invitations do not auto-join calls or grant moderator access.')
                            : copy('这是你收到的邀请，只有组织者可以修改日程。', 'You are invited. Only the organizer can edit this event.')}</Text>
                    </View>
                    <View style = { s.card }><Text style = { s.label }>{copy('备注', 'Notes')}</Text>
                        <TextInput
                            accessibilityLabel = { copy('备注', 'Notes') }
                            editable = { editable && !blocked }
                            maxLength = { 1000 }
                            multiline = { true }
                            onChangeText = { value => change('notes', value) }
                            style = { s.field }
                            value = { draft.notes } />
                    </View>
                    {Boolean(error) && <Text
                        accessibilityLiveRegion = 'polite'
                        style = { s.error }>{(errorCopy[error] || errorCopy.network_error)[zh ? 0 : 1]}</Text>}
                    {editable && <Pressable
                        accessibilityRole = 'button'
                        disabled = { blocked || loading || directoryFailed }
                        onPress = { () => submit() }
                        style = { [ s.button, (blocked || loading || directoryFailed) && s.disabled ] }>
                        {busy ? <ActivityIndicator color = { colors.white } /> : <Text style = { s.buttonText }>{copy('保存并同步日程', 'Save to calendars')}</Text>}
                    </Pressable>}
                    {event?.can_edit && <Pressable
                        accessibilityRole = 'button'
                        disabled = { blocked }
                        onPress = { () => Alert.alert(copy('取消这场会议？', 'Cancel this meeting?'), copy('将从所有参会者日程中移除，不会结束正在进行的通话。', 'Removed from all attendee calendars. Active calls are not ended.'), [
                            { text: copy('保留', 'Keep'), style: 'cancel' },
                            { text: copy('取消会议日程', 'Cancel meeting'), style: 'destructive', onPress: () => submit(true) }
                        ]) }
                        style = { [ s.button, s.danger ] }><Text style = { [ s.buttonText, s.dangerText ] }>{copy('取消会议日程', 'Cancel meeting')}</Text></Pressable>}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    </Modal>);
}
