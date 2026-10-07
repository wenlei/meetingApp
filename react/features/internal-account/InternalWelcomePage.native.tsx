import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions.native';
import logger from '../app/logger';
import { updateSettings } from '../base/settings/actions';
import WelcomePage from '../welcome/components/WelcomePage';

import ActiveDeviceHandoff from './ActiveDeviceHandoff.native';
import LoginPrismBackground from './LoginPrismBackground.native';
import MacWindowCard from './MacWindowCard.native';
import { promptAppUpdate } from './appUpdate.native';
import { brandAlpha, brandPalette } from './brandPalette.native';
import {
    IAccountUser,
    biometricLoginState,
    restoreSession,
    signIn,
    signInWithBiometrics,
    subscribeAccountSession,
    takeAccountError,
    takePendingRoom
} from './mobileSession.native';

const colors = {
    background: brandPalette.blackMoss,
    backdropShade: brandAlpha.overlay,
    border: brandAlpha.border,
    borderLight: 'rgba(255, 255, 255, 0.72)',
    dark: brandPalette.blackMoss,
    error: brandPalette.danger,
    green: brandPalette.teaLeaf,
    muted: brandPalette.teaLeaf,
    mutedDark: brandPalette.blackMoss,
    paper: brandAlpha.glass,
    rule: 'rgba(38, 72, 61, 0.34)',
    shadow: brandPalette.shadow,
    translucentWhite: 'rgba(255, 255, 255, 0.47)',
    transparent: 'transparent',
    white: brandPalette.moonYellow
};

const messages = {
    en: {
        brand: 'Guangyu Meeting',
        eyebrow: 'INTERNAL MEETING',
        login: 'Log in',
        loggingIn: 'Logging in…',
        password: 'Password',
        subtitle: 'Use your internal account. No need to enter your password for every meeting.',
        username: 'Username',
        usernameRequired: 'Enter your username and password.'
    },
    zh: {
        brand: '光域新能会议室',
        eyebrow: 'INTERNAL MEETING',
        login: '登录',
        loggingIn: '登录中…',
        password: '密码',
        subtitle: '使用内部账号登录。无需每场会议重复输入密码。',
        username: '用户名',
        usernameRequired: '请输入用户名和密码。'
    }
};

const englishErrors: Record<string, string> = {
    '账号信息不完整，请重新登录。': 'Account details are incomplete. Please log in again.',
    '账号服务没有返回登录凭证。': 'The account service did not return a login token.',
    '账号服务返回了无效响应，请稍后再试。': 'The account service returned an invalid response. Try again later.',
    '暂时无法连接账号服务，请检查网络后重试。': 'Cannot reach the account service. Check your connection and retry.',
    '用户名或密码不正确。': 'Incorrect username or password.',
    '登录已失效，请使用账号密码重新登录。': 'Your session has expired. Log in with your password.',
    '登录失败，请稍后再试。': 'Login failed. Try again later.',
    '退出失败，请稍后再试。': 'Could not log out. Try again later.',
    '生物识别不可用，请使用账号密码登录。': 'Biometric login is unavailable. Use your password.',
    '登录尝试过多，请稍后再试。': 'Too many login attempts. Try again later.',
    '请先使用账号密码登录并开启生物识别。': 'Log in with your password and enable biometrics first.',
    '请先在设备设置中录入指纹或面容。': 'Set up fingerprint or face recognition on this device first.',
    '请先登录内部账号。': 'Log in to your internal account first.',
    '无法保存登录状态，请稍后再试。': 'Could not save your login session. Try again later.',
    '未完成生物识别，请重试或使用账号密码登录。': 'Biometric verification was cancelled. Retry or use your password.',
    '未能开启生物识别，请确认设备已录入指纹或面容。': 'Could not enable biometrics. Check your device settings.',
    '暂时无法登录，请稍后再试。': 'Cannot log in right now. Try again later.'
};

const styles = StyleSheet.create({
    brand: { color: colors.dark, fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginBottom: 6 },
    brandBlock: { marginBottom: 24 },
    brandRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 13 },
    brandRule: { backgroundColor: colors.rule, flex: 1, height: 1, marginLeft: 12 },
    button: {
        alignItems: 'center',
        backgroundColor: colors.green,
        borderRadius: 14,
        minHeight: 50,
        justifyContent: 'center',
        marginTop: 12
    },
    buttonText: { color: colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
    cardContent: { paddingHorizontal: 22, paddingVertical: 20 },
    error: { color: colors.error, fontSize: 13, lineHeight: 19, marginTop: 10 },
    eyebrow: { color: colors.dark, fontSize: 11, fontWeight: '800', letterSpacing: 2.2 },
    field: {
        backgroundColor: colors.translucentWhite,
        borderColor: colors.border,
        borderRadius: 14,
        borderWidth: 1,
        color: colors.dark,
        fontSize: 16,
        minHeight: 50,
        paddingHorizontal: 15
    },
    label: { color: colors.mutedDark, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14 },
    loginCard: { flex: 1, justifyContent: 'center', maxWidth: 430, width: '100%' },
    loginScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
    loginPage: {
        alignItems: 'center',
        backgroundColor: colors.background,
        flex: 1,
        paddingHorizontal: 22,
        position: 'relative'
    },
    logo: { borderRadius: 14, height: 50, width: 50 },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    biometricPrompt: { alignItems: 'center', gap: 16, paddingVertical: 24 },
    biometricRetry: { color: colors.dark, fontSize: 14, paddingVertical: 14, textAlign: 'center' },
    welcome: { backgroundColor: colors.background, flex: 1 }
});

interface IProps {
    navigation: {
        setOptions: (options: Record<string, unknown>) => void;
    };
}

/**
 * The internal account gate around the stock Jitsi welcome screen.
 *
 * @returns {ReactElement} The account login or authenticated welcome screen.
 */
export default function InternalWelcomePage({ navigation }: IProps) {
    const dispatch = useDispatch();
    const { i18n } = useTranslation();
    const isChinese = i18n.language?.startsWith('zh') ?? true;
    const copy = isChinese ? messages.zh : messages.en;
    const [ user, setUser ] = useState<IAccountUser | null>(null);
    const [ username, setUsername ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ loading, setLoading ] = useState(true);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState(takeAccountError() || '');
    const [ biometricEnabled, setBiometricEnabled ] = useState(false);
    const [ passwordFallback, setPasswordFallback ] = useState(false);
    const [ reduceMotion, setReduceMotion ] = useState(false);
    const biometricAttempted = useRef(false);

    useEffect(() => {
        if (user) {
            promptAppUpdate(isChinese);
        }
    }, [ isChinese, user ]);

    useEffect(() => {
        let mounted = true;

        AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
            if (mounted) {
                setReduceMotion(enabled);
            }
        }).catch(cause => logger.warn('Unable to read reduced-motion setting:', cause));

        return () => {
            mounted = false;
        };
    }, []);

    const refreshBiometricState = useCallback(async () => {
        const state = await biometricLoginState();

        setBiometricEnabled(Boolean(state.type && state.enabled));
    }, []);

    const enterPendingRoom = useCallback(() => {
        const room = takePendingRoom();

        if (room) {
            dispatch(appNavigate(room));
        }
    }, [ dispatch ]);

    useEffect(() => {
        let mounted = true;

        Promise.all([ restoreSession(), biometricLoginState() ]).then(([ session, state ]) => {
            if (mounted) {
                setBiometricEnabled(Boolean(state.type && state.enabled));
                setUser(session?.user || null);
                if (session) {
                    dispatch(updateSettings({ displayName: session.user.display_name }));
                    enterPendingRoom();
                }
            }
        }).catch(cause => {
            logger.error('Unable to restore the internal account session:', cause);
            if (mounted) {
                setError('暂时无法连接账号服务，请检查网络后重试。');
            }
        }).finally(() => {
            if (mounted) {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [ dispatch, enterPendingRoom ]);

    useEffect(() => subscribeAccountSession(account => {
        setUser(account);
        if (!account) {
            // Logout / expiry revokes the protected token, so password is required.
            setBiometricEnabled(false);
            setPasswordFallback(true);
        }
    }), []);

    useEffect(() => {
        navigation.setOptions({ headerShown: Boolean(user), headerTitle: copy.brand });
    }, [ copy.brand, navigation, user ]);

    const enterAs = useCallback((authenticatedUser: IAccountUser) => {
        dispatch(updateSettings({ displayName: authenticatedUser.display_name }));
        setUser(authenticatedUser);
        enterPendingRoom();
    }, [ dispatch, enterPendingRoom ]);

    const login = useCallback(async () => {
        if (!username.trim() || !password) {
            setError(messages.zh.usernameRequired);

            return;
        }
        setBusy(true);
        setError('');
        try {
            const authenticatedUser = await signIn(username, password);

            setPassword('');
            enterAs(authenticatedUser);
            await refreshBiometricState();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : '登录失败，请稍后再试。');
        } finally {
            setBusy(false);
        }
    }, [ username, password, enterAs, refreshBiometricState ]);

    const biometricLogin = useCallback(async () => {
        setPasswordFallback(false);
        setBusy(true);
        setError('');
        try {
            enterAs(await signInWithBiometrics());
        } catch (cause) {
            setPasswordFallback(true);
            setError(cause instanceof Error ? cause.message : '登录失败，请稍后再试。');
            await refreshBiometricState();
        } finally {
            setBusy(false);
        }
    }, [ enterAs, refreshBiometricState ]);

    useEffect(() => {
        if (!loading && !user && biometricEnabled && !biometricAttempted.current) {
            biometricAttempted.current = true;
            biometricLogin();
        }
    }, [ biometricEnabled, biometricLogin, loading, user ]);

    const displayedError = isChinese ? error : englishErrors[error] || error;

    if (user) {
        return (
            <View style = { styles.welcome }>
                <ActiveDeviceHandoff key = { user.id } />
                { error ? <Text style = { styles.error }>{ displayedError }</Text> : null }
                <WelcomePage navigation = { navigation } />
            </View>
        );
    }

    return (
        <SafeAreaView style = { styles.loginPage }>
            <LoginPrismBackground reduceMotion = { reduceMotion } />
            <KeyboardAvoidingView
                behavior = { Platform.OS === 'ios' ? 'padding' : undefined }
                style = { styles.loginCard }>
                <ScrollView
                    contentContainerStyle = { styles.loginScroll }
                    keyboardShouldPersistTaps = 'handled'
                    showsVerticalScrollIndicator = { false }>
                    <MacWindowCard
                        glass = { true }
                        title = { isChinese ? '账号登录' : 'Account login' }>
                        <View style = { styles.cardContent }>
                            <View style = { styles.brandBlock }>
                                <View style = { styles.brandRow }>
                                    <Image
                                        source = { require('../../../branding/seal-guang-preview.png') }
                                        style = { styles.logo } />
                                    <View style = { styles.brandRule } />
                                    <Text style = { styles.eyebrow }>{ copy.eyebrow }</Text>
                                </View>
                                <Text style = { styles.brand }>{ copy.brand }</Text>
                                <Text style = { styles.subtitle }>{ copy.subtitle }</Text>
                            </View>
                            { loading
                                ? <ActivityIndicator color = { colors.green } />
                                : biometricEnabled && !passwordFallback
                                    ? <View style = { styles.biometricPrompt }>
                                        <ActivityIndicator color = { colors.green } />
                                        <Text style = { styles.subtitle }>{isChinese
                                            ? '请通过指纹或面容验证身份，取消后可使用密码。'
                                            : 'Use biometrics to sign in. Cancel to use your password.'}</Text>
                                    </View>
                                    : <>
                                    <Text style = { styles.label }>{ copy.username }</Text>
                                    <TextInput
                                        autoCapitalize = 'none'
                                        autoComplete = 'username'
                                        editable = { !busy }
                                        onChangeText = { setUsername }
                                        style = { styles.field }
                                        value = { username } />
                                    <Text style = { styles.label }>{ copy.password }</Text>
                                    <TextInput
                                        autoComplete = 'password'
                                        editable = { !busy }
                                        onChangeText = { setPassword }
                                        onSubmitEditing = { login }
                                        secureTextEntry = { true }
                                        style = { styles.field }
                                        value = { password } />
                                    { error ? <Text style = { styles.error }>{ displayedError }</Text> : null }
                                    <Pressable
                                        accessibilityRole = 'button'
                                        disabled = { busy }
                                        onPress = { login }
                                        style = { styles.button }>
                                        <Text style = { styles.buttonText }>{ busy ? copy.loggingIn : copy.login }</Text>
                                    </Pressable>
                                    {biometricEnabled && <Pressable
                                        accessibilityRole = 'button'
                                        disabled = { busy }
                                        onPress = { biometricLogin }>
                                        <Text style = { styles.biometricRetry }>{isChinese ? '重试指纹 / 面容识别' : 'Try biometrics again'}</Text>
                                    </Pressable>}
                                </> }
                        </View>
                    </MacWindowCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
