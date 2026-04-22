import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addHabitToAPI,
  fetchHabitsFromAPI,
  updateHabitInAPI,
} from "../utils/apiService";
import {
  cancelHabitNotification,
  scheduleHabitNotification,
} from "../utils/notificationService";
import { Colors } from '../utils/theme';

const ICONS = ["🧘", "📚", "💪", "💧", "🏃", "🎨", "🎵", "🍎", "😴", "✍️", "🧠", "🚴"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function AddHabitScreen() {
  const router = useRouter();
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const isEditing = !!habitId;

  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🧘");
  const [difficulty, setDifficulty] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  useEffect(() => {
    if (isEditing) {
      const loadHabit = async () => {
        const habits = await fetchHabitsFromAPI();
        const habit = habits.find((h: any) => h._id === habitId || String(h.id) === habitId);
        if (habit) {
          setName(habit.name);
          setSelectedIcon(habit.icon);
          setDifficulty(habit.difficulty);
          setNotes(habit.notes || "");
          setReminderTime(habit.reminderTime || "");
          if (habit.reminderTime) {
            const parts = habit.reminderTime.split(/[: ]/);
            setHour(parts[0]); setMinute(parts[1]); setAmpm(parts[2] || "AM");
          }
        }
      };
      loadHabit();
    }
  }, [habitId, isEditing]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Oops!", "Please enter a habit name.");
      return;
    }
    try {
      if (isEditing) {
        await updateHabitInAPI(habitId, {
          name: name.trim(), icon: selectedIcon, difficulty, notes: notes.trim(), reminderTime: reminderTime || undefined,
        });
        const updatedHabits = await fetchHabitsFromAPI();
        const updatedHabit = updatedHabits.find((h: any) => h._id === habitId || String(h.id) === habitId);
        if (updatedHabit) {
          if (reminderTime) await scheduleHabitNotification(updatedHabit);
          else await cancelHabitNotification((updatedHabit as any)._id || habitId);
        }
      } else {
        const newHabit = await addHabitToAPI({
          name: name.trim(), icon: selectedIcon, difficulty, notes: notes.trim(), reminderTime: reminderTime || undefined,
        });
        if (reminderTime && newHabit) await scheduleHabitNotification(newHabit);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to save habit.");
    }
  };

  const confirmTime = () => {
    setReminderTime(`${hour}:${minute} ${ampm}`);
    setShowTimePicker(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.cancelBtn}>Cancel</Text></TouchableOpacity>
        <Text style={styles.title}>{isEditing ? "Edit Habit" : "New Habit"}</Text>
        <TouchableOpacity onPress={handleSave}><Text style={styles.saveBtn}>{isEditing ? "Update" : "Save"}</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Morning Meditation" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />

        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((icon) => (
            <TouchableOpacity key={icon} style={[styles.iconBtn, selectedIcon === icon && styles.iconBtnSelected]} onPress={() => setSelectedIcon(icon)}>
              <Text style={styles.iconEmoji}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity key={d} style={[styles.diffBtn, difficulty === d && styles.diffBtnSelected]} onPress={() => setDifficulty(d)}>
              <Text style={[styles.diffText, difficulty === d && { color: Colors.primary }]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Reminder</Text>
        <TouchableOpacity style={styles.reminderRow} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.reminderText}>{reminderTime || "Set time"}</Text>
          {reminderTime ? <TouchableOpacity onPress={() => setReminderTime("")}><Text style={styles.clearText}>✕</Text></TouchableOpacity> : null}
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Optional" placeholderTextColor={Colors.textMuted} value={notes} onChangeText={setNotes} multiline />

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: Colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Set Time</Text>
            <View style={styles.pickerRow}>
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity key={h} style={[styles.pickerItem, hour === h && { backgroundColor: Colors.primary }]} onPress={() => setHour(h)}>
                    <Text style={[styles.pickerItemText, hour === h && { color: Colors.background, fontWeight: 'bold' }]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.pickerColon, { color: Colors.textMuted }]}>:</Text>
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity key={m} style={[styles.pickerItem, minute === m && { backgroundColor: Colors.primary }]} onPress={() => setMinute(m)}>
                    <Text style={[styles.pickerItemText, minute === m && { color: Colors.background, fontWeight: 'bold' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.ampmColumn}>
                {["AM", "PM"].map((p) => (
                  <TouchableOpacity key={p} style={[styles.ampmBtn, ampm === p && { backgroundColor: Colors.primary }]} onPress={() => setAmpm(p)}>
                    <Text style={[styles.ampmText, ampm === p && { color: Colors.background }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTimePicker(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmTime}><Text style={styles.modalConfirmText}>Set</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancelBtn: { fontSize: 16, color: Colors.textMuted },
  title: { fontSize: 18, fontWeight: "bold", color: Colors.textPrimary },
  saveBtn: { fontSize: 16, color: Colors.primary, fontWeight: "bold" },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  label: { fontSize: 12, fontWeight: "bold", color: Colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  iconBtnSelected: { borderColor: Colors.accent, backgroundColor: Colors.surfaceSubtle },
  iconEmoji: { fontSize: 24 },
  difficultyRow: { flexDirection: "row", gap: 10 },
  diffBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  diffBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceSubtle },
  diffText: { fontSize: 14, color: Colors.textMuted, fontWeight: "bold" },
  reminderRow: { flexDirection: "row", alignItems: "center", justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  reminderText: { color: Colors.textPrimary, fontSize: 16 },
  clearText: { color: Colors.primary, fontSize: 18, paddingLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { borderRadius: 20, padding: 24, width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 160 },
  pickerColumn: { width: 60, height: 160 },
  pickerColon: { fontSize: 24, marginHorizontal: 8 },
  pickerItem: { padding: 10, alignItems: "center", borderRadius: 10, marginBottom: 4 },
  pickerItemText: { fontSize: 18, color: Colors.textMuted },
  ampmColumn: { marginLeft: 16, gap: 10 },
  ampmBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: Colors.surfaceSubtle },
  ampmText: { fontSize: 14, color: Colors.textMuted, fontWeight: "bold" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, padding: 14, alignItems: "center" },
  modalCancelText: { color: Colors.textMuted, fontSize: 16 },
  modalConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center" },
  modalConfirmText: { color: Colors.background, fontSize: 16, fontWeight: "bold" },
});