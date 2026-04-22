import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import BottomNav from '../components/BottomNav';
import { clearSessionsFromAPI, fetchSessionsFromAPI, saveSessionToAPI } from '../utils/apiService';
import { type Session } from '../utils/types';
import { Colors } from '../utils/theme';

interface Lap {
    index: number;
    elapsed: number;
    split: number;
}

const STORAGE_KEY = '@timer_sessions';
const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
};

function ProgressRing({
    progress,
    color,
    size = 260,
}: {
    progress: number;
    color: string;
    size?: number;
}) {
    const r = (size - 20) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
    return (
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.surfaceSubtle} strokeWidth={8} fill="none" />
            <Circle
                cx={size / 2} cy={size / 2} r={r}
                stroke={color} strokeWidth={8} fill="none"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" rotation="-90" originX={size / 2} originY={size / 2}
            />
        </Svg>
    );
}

export default function TimerScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<'stopwatch' | 'countdown'>('stopwatch');
    const [swElapsed, setSwElapsed] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const [swLaps, setSwLaps] = useState<Lap[]>([]);
    const swInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const swLastLap = useRef(0);
    const [cdTotal, setCdTotal] = useState(25 * 60);
    const [cdRemaining, setCdRemaining] = useState(25 * 60);
    const [cdRunning, setCdRunning] = useState(false);
    const [cdFinished, setCdFinished] = useState(false);
    const [showCdPicker, setShowCdPicker] = useState(false);
    const [cdHours, setCdHours] = useState('0');
    const [cdMins, setCdMins] = useState('25');
    const [cdSecs, setCdSecs] = useState('0');
    const cdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const [taskName, setTaskName] = useState('');
    const [showTaskInput, setShowTaskInput] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useFocusEffect(useCallback(() => {
        loadSessions();
        return () => {
            if (swInterval.current) clearInterval(swInterval.current);
            if (cdInterval.current) clearInterval(cdInterval.current);
        };
    }, []));

    const loadSessions = async () => {
        try {
            const data = await fetchSessionsFromAPI();
            setSessions(data);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) setSessions(JSON.parse(raw));
        }
    };

    const saveSession = async (duration: number, mode: 'stopwatch' | 'countdown') => {
        if (duration < 3) return;
        try {
            const sessionData = {
                taskName: taskName.trim() || 'Unnamed task',
                duration,
                mode,
                timestamp: new Date().toISOString(),
            };
            const newSession = await saveSessionToAPI(sessionData);
            setSessions(prev => [newSession, ...prev].slice(0, 20));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    };

    const swStart = () => {
        setSwRunning(true);
        swInterval.current = setInterval(() => setSwElapsed(e => e + 1), 1000);
    };
    const swPause = () => {
        setSwRunning(false);
        if (swInterval.current) clearInterval(swInterval.current);
    };
    const swReset = () => {
        swPause(); setSwElapsed(0); setSwLaps([]); swLastLap.current = 0;
    };
    const swLap = () => {
        const split = swElapsed - swLastLap.current;
        setSwLaps(prev => [...prev, { index: prev.length + 1, elapsed: swElapsed, split }]);
        swLastLap.current = swElapsed;
    };

    const cdStart = () => {
        if (cdRemaining === 0) return;
        setCdRunning(true);
        setCdFinished(false);
        cdInterval.current = setInterval(() => {
            setCdRemaining(r => {
                if (r <= 1) {
                    clearInterval(cdInterval.current!);
                    setCdRunning(false); setCdFinished(true);
                    Vibration.vibrate([0, 400, 200, 400]);
                    saveSession(cdTotal, 'countdown');
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
    };
    const cdPause = () => {
        setCdRunning(false); if (cdInterval.current) clearInterval(cdInterval.current);
    };
    const cdReset = () => { cdPause(); setCdRemaining(cdTotal); setCdFinished(false); };
    const cdApplyTime = () => {
        const total = (parseInt(cdHours) || 0) * 3600 + (parseInt(cdMins) || 0) * 60 + (parseInt(cdSecs) || 0);
        if (total === 0) return;
        setCdTotal(total); setCdRemaining(total); setCdFinished(false); setShowCdPicker(false);
    };

    const swProgress = (swElapsed % 60) / 60;
    const cdProgress = cdTotal > 0 ? cdRemaining / cdTotal : 0;
    const cdColor = cdProgress > 0.2 ? Colors.primary : Colors.accent;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>⏱ Timer</Text>
                <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistory(true)}>
                    <Text style={styles.historyBtnText}>History</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tabBtn, tab === 'stopwatch' && styles.tabBtnActive]} onPress={() => setTab('stopwatch')}>
                    <Text style={[styles.tabBtnText, tab === 'stopwatch' && styles.tabBtnTextActive]}>Stopwatch</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, tab === 'countdown' && styles.tabBtnActive]} onPress={() => setTab('countdown')}>
                    <Text style={[styles.tabBtnText, tab === 'countdown' && styles.tabBtnTextActive]}>Countdown</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.taskPill} onPress={() => setShowTaskInput(true)}>
                    <Text style={styles.taskPillIcon}>🎯</Text>
                    <Text style={styles.taskPillText} numberOfLines={1}>{taskName.trim() || 'Assign a task'}</Text>
                </TouchableOpacity>

                {tab === 'stopwatch' && (
                    <View style={styles.timerSection}>
                        <View style={styles.ringWrapper}>
                            <ProgressRing progress={swProgress} color={Colors.primary} />
                            <View style={styles.ringInner}>
                                <Text style={styles.timerDisplay}>{formatTime(swElapsed)}</Text>
                                <Text style={styles.timerLabel}>{swRunning ? 'Running' : 'Paused'}</Text>
                            </View>
                        </View>
                        <View style={styles.controlRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={swRunning ? swLap : swReset}>
                                <Text style={styles.secondaryBtnText}>{swRunning ? 'Lap' : 'Reset'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mainBtn, swRunning && { backgroundColor: Colors.accent }]} onPress={swRunning ? swPause : swStart}>
                                <Text style={styles.mainBtnText}>{swRunning ? '⏸' : '▶'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { saveSession(swElapsed, 'stopwatch'); swReset(); }}>
                                <Text style={styles.secondaryBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {tab === 'countdown' && (
                    <View style={styles.timerSection}>
                        <View style={styles.ringWrapper}>
                            <ProgressRing progress={cdProgress} color={cdColor} />
                            <View style={styles.ringInner}>
                                <Text style={[styles.timerDisplay, { color: cdColor }]}>{formatTime(cdRemaining)}</Text>
                                <Text style={styles.timerLabel}>{cdFinished ? 'Finished' : cdRunning ? 'Running' : 'Paused'}</Text>
                            </View>
                        </View>
                        {!cdRunning && (
                            <TouchableOpacity style={styles.setTimeBtn} onPress={() => setShowCdPicker(true)}>
                                <Text style={styles.setTimeBtnText}>Set Time</Text>
                            </TouchableOpacity>
                        )}
                        <View style={styles.controlRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={cdReset}><Text style={styles.secondaryBtnText}>Reset</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.mainBtn, cdRunning && { backgroundColor: Colors.accent }]} onPress={cdRunning ? cdPause : cdStart}>
                                <Text style={styles.mainBtnText}>{cdRunning ? '⏸' : '▶'}</Text>
                            </TouchableOpacity>
                            <View style={{ width: 56 }} />
                        </View>
                    </View>
                )}
            </ScrollView>

            <Modal visible={showTaskInput} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Task</Text>
                        <TextInput style={styles.modalInput} value={taskName} onChangeText={setTaskName} autoFocus />
                        <TouchableOpacity style={styles.modalConfirm} onPress={() => setShowTaskInput(false)}><Text style={styles.modalConfirmText}>Done</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showCdPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Set Time</Text>
                        <View style={styles.timePickerRow}>
                            <TextInput style={styles.timeInput} keyboardType="number-pad" value={cdHours} onChangeText={setCdHours} />
                            <Text style={styles.timeColon}>:</Text>
                            <TextInput style={styles.timeInput} keyboardType="number-pad" value={cdMins} onChangeText={setCdMins} />
                            <Text style={styles.timeColon}>:</Text>
                            <TextInput style={styles.timeInput} keyboardType="number-pad" value={cdSecs} onChangeText={setCdSecs} />
                        </View>
                        <TouchableOpacity style={styles.modalConfirm} onPress={cdApplyTime}><Text style={styles.modalConfirmText}>Set</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showHistory} transparent animationType="slide">
                <View style={styles.historyOverlay}>
                    <View style={styles.historyBox}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>History</Text>
                            <TouchableOpacity onPress={() => setShowHistory(false)}><Text style={styles.historyClose}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {sessions.map(s => (
                                <View key={s.id} style={styles.sessionCard}>
                                    <View>
                                        <Text style={styles.sessionTask}>{s.taskName}</Text>
                                        <Text style={styles.sessionTime}>{new Date(s.timestamp).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.sessionDuration}>{formatDuration(s.duration)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
    historyBtn: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
    historyBtnText: { fontSize: 13, color: Colors.textMuted },
    tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.surface, borderRadius: 14, padding: 4 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: Colors.primary },
    tabBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
    tabBtnTextActive: { color: Colors.background },
    scrollContent: { paddingHorizontal: 20 },
    taskPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 30, borderWidth: 1, borderColor: Colors.border, gap: 10 },
    taskPillIcon: { fontSize: 18 },
    taskPillText: { flex: 1, fontSize: 15, color: Colors.textMuted },
    timerSection: { alignItems: 'center' },
    ringWrapper: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    ringInner: { alignItems: 'center' },
    timerDisplay: { fontSize: 56, fontWeight: '300', color: Colors.textPrimary, letterSpacing: 2 },
    timerLabel: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
    setTimeBtn: { backgroundColor: Colors.surfaceSubtle, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 30 },
    setTimeBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
    controlRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    mainBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    mainBtnText: { fontSize: 32, color: Colors.background },
    secondaryBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
    secondaryBtnText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 30 },
    modalBox: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20 },
    modalInput: { backgroundColor: Colors.surfaceSubtle, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 16, marginBottom: 20 },
    modalConfirm: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    modalConfirmText: { color: Colors.background, fontWeight: 'bold', fontSize: 16 },
    timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    timeInput: { backgroundColor: Colors.surfaceSubtle, width: 60, borderRadius: 10, padding: 10, color: Colors.textPrimary, fontSize: 24, textAlign: 'center' },
    timeColon: { fontSize: 24, color: Colors.textMuted, marginHorizontal: 8 },
    historyOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    historyBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '70%', borderWidth: 1, borderColor: Colors.border },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    historyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
    historyClose: { fontSize: 24, color: Colors.textMuted },
    sessionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    sessionTask: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    sessionTime: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
    sessionDuration: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
});