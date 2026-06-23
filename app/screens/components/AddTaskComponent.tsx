import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://life-os-backend-1ozl.onrender.com/api";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#263348",
  accent: "#6366F1",
  accentSoft: "#8B5CF6",
  success: "#10B981",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
  borderFocus: "#6366F1",
  error: "#EF4444",
  inputBg: "#1E293B",
  priorityHigh: "#EF4444",
  priorityMed: "#F59E0B",
  priorityLow: "#10B981",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "HIGH" | "MEDIUM" | "LOW";
type PickerMode = "date" | "time" | null;

interface AddTaskProps {
  onTaskAdded?: () => void;
}

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITIES: { value: Priority; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "HIGH",   label: "High",   color: C.priorityHigh, icon: "flame-outline" },
  { value: "MEDIUM", label: "Medium", color: C.priorityMed,  icon: "alert-circle-outline" },
  { value: "LOW",    label: "Low",    color: C.priorityLow,  icon: "leaf-outline" },
];

// ─── Focused Input ────────────────────────────────────────────────────────────
interface FocusFieldRenderProps {
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}
interface FieldProps {
  children: (props: FocusFieldRenderProps) => React.ReactNode;
}
function FocusField({ children }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.borderFocus],
  });

  return (
    <Animated.View style={[ff.wrap, { borderColor }, focused && ff.wrapFocused]}>
      {children({ focused, onFocus, onBlur })}
    </Animated.View>
  );
}

const ff = StyleSheet.create({
  wrap: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  wrapFocused: { backgroundColor: C.surfaceAlt },
});

// ─── Section Label ────────────────────────────────────────────────────────────
function Label({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <Text style={sl.text}>{text}</Text>
      {optional && <Text style={sl.opt}>optional</Text>}
    </View>
  );
}
const sl = StyleSheet.create({
  text: { fontSize: 11, fontWeight: "700", color: C.textSecondary, letterSpacing: 1.2, textTransform: "uppercase" },
  opt:  { fontSize: 10, color: C.textSecondary, opacity: 0.5, fontWeight: "500" },
});

// ─── Picker Row Button ────────────────────────────────────────────────────────
function PickerRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, { marginBottom: 14 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
        style={pr.row}
      >
        <View style={pr.iconWrap}>
          <Ionicons name={icon} size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pr.label}>{label}</Text>
          <Text style={pr.value}>{value}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const pr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 10, fontWeight: "700", color: C.textSecondary, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddTaskComponent({ onTaskAdded }: AddTaskProps) {
  const [taskName, setTaskName]           = useState("");
  const [description, setDescription]    = useState("");
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [selectedTime, setSelectedTime]   = useState(new Date());
  const [priority, setPriority]           = useState<Priority>("MEDIUM");
  const [pickerMode, setPickerMode]       = useState<PickerMode>(null);
  const [loading, setLoading]             = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Pickers ──────────────────────────────────────────────────────────────────
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") { setPickerMode(null); return; }
    if (!selected) return;

    if (pickerMode === "date") {
      setSelectedDate(selected);
      if (Platform.OS === "android") setTimeout(() => setPickerMode("time"), 150);
      else setPickerMode(null);
    } else {
      setSelectedTime(selected);
      setPickerMode(null);
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────────
  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const formatTimeDisplay = (t: Date) =>
    t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

  const formatDateDB = (d: Date) => d.toISOString().split("T")[0];
  const formatTimeDB = (t: Date) => {
    const h = t.getHours().toString().padStart(2, "0");
    const m = t.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!taskName.trim()) {
      Alert.alert("Missing Task Name", "Please enter a task name to continue.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        return;
      }

      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskName: taskName.trim(),
          description: description.trim(),
          taskDate: formatDateDB(selectedDate),
          taskTime: formatTimeDB(selectedTime),
          priority,
        }),
      });

      if (response.ok) {
        Alert.alert("Task Added", "Your task has been added successfully.");
        setTaskName("");
        setDescription("");
        setSelectedDate(new Date());
        setSelectedTime(new Date());
        setPriority("MEDIUM");
        onTaskAdded?.();
      } else {
        const err = await response.json().catch(() => null);
        Alert.alert("Failed to Add Task", err?.message ?? `Server error ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Connection Error", "Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View
      style={[s.root, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.scroll}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Ionicons name="add-circle-outline" size={20} color={C.accent} />
          </View>
          <View>
            <Text style={s.headerTitle}>New Task</Text>
            <Text style={s.headerSub}>Plan your next move</Text>
          </View>
        </View>

        {/* ── Task Name ── */}
        <Label text="Task Name" />
        <FocusField>
          {({ onFocus, onBlur }) => (
            <TextInput
              style={s.nameInput}
              placeholder="What do you want to accomplish?"
              placeholderTextColor={C.textSecondary}
              value={taskName}
              onChangeText={(t) => setTaskName(t.slice(0, 100))}
              onFocus={onFocus}
              onBlur={onBlur}
              maxLength={100}
              returnKeyType="next"
              selectionColor={C.accent}
            />
          )}
        </FocusField>
        <Text style={s.charCount}>{taskName.length}/100</Text>

        {/* ── Description ── */}
        <Label text="Description" optional />
        <FocusField>
          {({ onFocus, onBlur }) => (
            <TextInput
              style={s.descInput}
              placeholder="Add additional details..."
              placeholderTextColor={C.textSecondary}
              value={description}
              onChangeText={setDescription}
              onFocus={onFocus}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              selectionColor={C.accent}
            />
          )}
        </FocusField>

        {/* ── Date & Time ── */}
        <Label text="Schedule" />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <PickerRow
              icon="calendar-outline"
              label="Date"
              value={formatDateDisplay(selectedDate)}
              onPress={() => setPickerMode("date")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PickerRow
              icon="time-outline"
              label="Time"
              value={formatTimeDisplay(selectedTime)}
              onPress={() => setPickerMode("time")}
            />
          </View>
        </View>

        {/* ── Priority ── */}
        <Label text="Priority" />
        <View style={s.priorityRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPriority(p.value)}
                activeOpacity={0.8}
                style={[
                  s.priorityChip,
                  {
                    borderColor: active ? p.color : C.border,
                    backgroundColor: active ? p.color + "18" : C.surface,
                  },
                ]}
              >
                <Ionicons
                  name={p.icon}
                  size={14}
                  color={active ? p.color : C.textSecondary}
                />
                <Text
                  style={[
                    s.priorityLabel,
                    { color: active ? p.color : C.textSecondary, fontWeight: active ? "700" : "500" },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, loading && s.submitBtnDisabled]}
          onPress={handleAddTask}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={s.submitText}>Add Task</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Date / Time Pickers ── */}
      {pickerMode !== null && (
        <DateTimePicker
          value={pickerMode === "date" ? selectedDate : selectedTime}
          mode={pickerMode}
          display={
            pickerMode === "date"
              ? Platform.OS === "ios" ? "inline" : "calendar"
              : Platform.OS === "ios" ? "spinner" : "clock"
          }
          minimumDate={pickerMode === "date" ? new Date() : undefined}
          is24Hour={false}
          onChange={onPickerChange}
        />
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 36,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 1,
  },

  // Inputs
  nameInput: {
    fontSize: 15,
    color: C.textPrimary,
    paddingVertical: 15,
    letterSpacing: 0.1,
  },
  descInput: {
    fontSize: 14,
    color: C.textPrimary,
    paddingVertical: 14,
    minHeight: 80,
    letterSpacing: 0.1,
  },
  charCount: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 16,
    opacity: 0.5,
  },

  // Row layout for date/time
  row: {
    flexDirection: "row",
    gap: 10,
  },

  // Priority
  priorityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  priorityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  priorityLabel: {
    fontSize: 13,
    letterSpacing: 0.1,
  },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});