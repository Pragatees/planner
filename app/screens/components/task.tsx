import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://life-os-backend-1ozl.onrender.com/api";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#263348",
  accent: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "HIGH" | "MEDIUM" | "LOW";

interface Task {
  id: string;
  taskName: string;
  description: string;
  taskDate: string;
  taskTime: string;
  priority: Priority;
  completed: boolean;
}

interface TodayTaskComponentProps {
  /** Optional: increment to force a refetch from a parent (e.g. after adding a task) */
  refreshTrigger?: number;
  /** Optional: called after complete / update / delete so a parent can refresh other UI */
  onTaskChanged?: () => void;
}

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High", color: C.danger },
  MEDIUM: { label: "Medium", color: C.warning },
  LOW: { label: "Low", color: C.success },
};

const PRIORITY_OPTIONS: Priority[] = ["HIGH", "MEDIUM", "LOW"];

// Lower number = higher priority = sorted first
const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatTimeDisplay(timeStr: string): string {
  // timeStr expected as "HH:mm" or "HH:mm:ss"
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateDB(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTimeDB(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function parseTaskTimeToDate(timeStr: string): Date {
  const [hours, minutes, seconds] = timeStr.split(":");
  const date = new Date();
  date.setHours(Number(hours) || 0, Number(minutes) || 0, Number(seconds) || 0, 0);
  return date;
}

function sortByPriority(taskList: Task[]): Task[] {
  return [...taskList].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 20, duration: 220, useNativeDriver: true }),
        ]).start();
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[toast.wrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <Text style={toast.text}>{message}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 50,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: "center",
  },
});

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ completed, onPress }: { completed: boolean; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          cb.box,
          completed && cb.boxCompleted,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </Animated.View>
    </TouchableOpacity>
  );
}

const cb = StyleSheet.create({
  box: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  boxCompleted: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
});

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <View style={[badge.wrap, { backgroundColor: config.color + "18", borderColor: config.color + "40" }]}>
      <View style={[badge.dot, { backgroundColor: config.color }]} />
      <Text style={[badge.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  index,
  onComplete,
  onEdit,
  onDelete,
}: {
  task: Task;
  index: number;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 360,
        delay: Math.min(index * 70, 350),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 360,
        delay: Math.min(index * 70, 350),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        card.wrap,
        task.completed && card.wrapCompleted,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={card.row}>
        <Checkbox completed={task.completed} onPress={() => onComplete(task.id)} />

        <View style={card.content}>
          <Text
            style={[card.taskName, task.completed && card.taskNameCompleted]}
            numberOfLines={2}
          >
            {task.taskName}
          </Text>

          {!!task.description && (
            <Text
              style={[card.description, task.completed && card.descriptionCompleted]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          <View style={card.metaRow}>
            <View style={card.timeWrap}>
              <Ionicons name="time-outline" size={13} color={C.textSecondary} />
              <Text style={card.timeText}>{formatTimeDisplay(task.taskTime)}</Text>
            </View>
            <PriorityBadge priority={task.priority} />
          </View>
        </View>
      </View>

      <View style={card.actionsRow}>
        <TouchableOpacity style={card.actionBtn} onPress={() => onEdit(task)} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={C.textSecondary} />
          <Text style={card.actionText}>Edit</Text>
        </TouchableOpacity>

        <View style={card.actionDivider} />

        <TouchableOpacity style={card.actionBtn} onPress={() => onDelete(task.id)} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={C.danger} />
          <Text style={[card.actionText, { color: C.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  wrapCompleted: {
    opacity: 0.55,
  },
  row: {
    flexDirection: "row",
    gap: 14,
  },
  content: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  taskNameCompleted: {
    textDecorationLine: "line-through",
    color: C.textSecondary,
  },
  description: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  descriptionCompleted: {
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  actionDivider: {
    width: 1,
    height: 18,
    backgroundColor: C.border,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconWrap}>
        <Ionicons name="checkmark-done-circle-outline" size={32} color={C.accent} />
      </View>
      <Text style={empty.title}>No tasks scheduled today.</Text>
      <Text style={empty.subtitle}>Plan something meaningful.</Text>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "33",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
  },
});

// ─── Edit Modal ───────────────────────────────────────────────────────────────
type PickerMode = "date" | "time" | null;

function EditTaskModal({
  visible,
  task,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, updated: Omit<Task, "id" | "completed">) => void;
  saving: boolean;
}) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [taskDate, setTaskDate] = useState(new Date());
  const [taskTime, setTaskTime] = useState(new Date());
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  useEffect(() => {
    if (task) {
      setTaskName(task.taskName);
      setDescription(task.description ?? "");
      const date = new Date(task.taskDate);
      setTaskDate(Number.isNaN(date.getTime()) ? new Date() : date);
      setTaskTime(parseTaskTimeToDate(task.taskTime));
      setPriority(task.priority);
      setPickerMode(null);
    }
  }, [task]);

  if (!task) return null;

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setPickerMode(null);
      return;
    }
    if (!selected) return;

    if (pickerMode === "date") {
      setTaskDate(selected);
    } else {
      setTaskTime(selected);
    }
    setPickerMode(null);
  };

  const handleSave = () => {
    if (!taskName.trim()) {
      Alert.alert("Missing Task Name", "Please enter a task name.");
      return;
    }

    onSave(task.id, {
      taskName: taskName.trim(),
      description: description.trim(),
      taskDate: formatDateDB(taskDate),
      taskTime: formatTimeDB(taskTime),
      priority,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modal.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Edit Task</Text>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={modal.scroll}>
            <Text style={modal.label}>Task Name</Text>
            <TextInput
              style={modal.input}
              value={taskName}
              onChangeText={(t) => setTaskName(t.slice(0, 100))}
              placeholder="Task name"
              placeholderTextColor={C.textSecondary}
              maxLength={100}
              selectionColor={C.accent}
            />

            <Text style={modal.label}>Description</Text>
            <TextInput
              style={[modal.input, modal.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details..."
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              selectionColor={C.accent}
            />

            <View style={modal.row}>
              <View style={{ flex: 1 }}>
                <Text style={modal.label}>Date</Text>
                <TouchableOpacity style={modal.pickerBtn} onPress={() => setPickerMode("date")}>
                  <Ionicons name="calendar-outline" size={16} color={C.accent} />
                  <Text style={modal.pickerText}>{formatDateDisplay(formatDateDB(taskDate))}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.label}>Time</Text>
                <TouchableOpacity style={modal.pickerBtn} onPress={() => setPickerMode("time")}>
                  <Ionicons name="time-outline" size={16} color={C.accent} />
                  <Text style={modal.pickerText}>{formatTimeDisplay(formatTimeDB(taskTime))}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={modal.label}>Priority</Text>
            <View style={modal.priorityRow}>
              {PRIORITY_OPTIONS.map((p) => {
                const config = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                    style={[
                      modal.priorityChip,
                      {
                        borderColor: active ? config.color : C.border,
                        backgroundColor: active ? config.color + "18" : C.surfaceAlt,
                      },
                    ]}
                  >
                    <View style={[modal.priorityDot, { backgroundColor: config.color }]} />
                    <Text
                      style={[
                        modal.priorityLabel,
                        { color: active ? config.color : C.textSecondary, fontWeight: active ? "700" : "500" },
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[modal.saveBtn, saving && modal.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={modal.saveText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {pickerMode !== null && (
          <DateTimePicker
            value={pickerMode === "date" ? taskDate : taskTime}
            mode={pickerMode}
            display={
              pickerMode === "date"
                ? Platform.OS === "ios" ? "inline" : "calendar"
                : Platform.OS === "ios" ? "spinner" : "clock"
            }
            is24Hour={false}
            onChange={onPickerChange}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  scroll: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.textPrimary,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    flexShrink: 1,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
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
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TodayTaskComponent({ refreshTrigger, onTaskChanged }: TodayTaskComponentProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingMessage, setConnectingMessage] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const getToken = useCallback(async () => {
    return AsyncStorage.getItem("token");
  }, []);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const slowTimer = setTimeout(() => setConnectingMessage(true), 3000);

    try {
      const token = await getToken();

      const response = await fetch(`${API_URL}/tasks/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(sortByPriority(Array.isArray(data) ? data : []));
      } else {
        Alert.alert("Unable to Load Tasks", `Server responded with status ${response.status}.`);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Connection Error", "Unable to reach the server. Please try again.");
    } finally {
      clearTimeout(slowTimer);
      setConnectingMessage(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  const onRefresh = useCallback(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // ── Complete ──────────────────────────────────────────────────────────────
  const completeTask = async (taskId: string) => {
    const previousTasks = tasks;

    // Optimistic update
    const optimisticTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: true } : t
    );
    setTasks(optimisticTasks);

    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to complete task.");
      }

      // Server confirmed — keep optimistic state (merge any server fields if present)
      const updatedTask = await response.json().catch(() => null);
      if (updatedTask && updatedTask.id) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
        );
      }

      const allCompleted = optimisticTasks.every((t) => t.completed);
      if (allCompleted && optimisticTasks.length > 0) {
        showToast("🎉 Congratulations! You completed all today's tasks.");
      } else {
        showToast("Task completed successfully.");
      }

      onTaskChanged?.();
    } catch (error) {
      console.error("Task Completion Error:", error);
      // Revert — do not modify local UI state on failure
      setTasks(previousTasks);
      Alert.alert("Update Failed", "Unable to update task status. Please try again.");
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditModalVisible(false);
    setEditingTask(null);
  };

  const saveEdit = async (taskId: string, updated: Omit<Task, "id" | "completed">) => {
    try {
      setSaving(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });

      if (response.ok) {
        setEditModalVisible(false);
        setEditingTask(null);
        await fetchTasks();
        onTaskChanged?.();
      } else {
        const err = await response.json().catch(() => null);
        Alert.alert("Update Failed", err?.message ?? `Server error ${response.status}`);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Connection Error", "Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = (taskId: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTask(taskId) },
      ]
    );
  };

  const deleteTask = async (taskId: string) => {
    try {
      const token = await getToken();

      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchTasks();
        onTaskChanged?.();
      } else {
        Alert.alert("Delete Failed", `Server error ${response.status}`);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Connection Error", "Unable to reach the server. Please try again.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={C.accent} size="large" />
        {connectingMessage && <Text style={s.connectingText}>Connecting to Life OS...</Text>}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TaskCard
            task={item}
            index={index}
            onComplete={completeTask}
            onEdit={openEdit}
            onDelete={confirmDelete}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />

      <EditTaskModal
        visible={editModalVisible}
        task={editingTask}
        onClose={closeEdit}
        onSave={saveEdit}
        saving={saving}
      />

      <Toast message={toastMessage ?? ""} visible={toastVisible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    padding: 20,
    paddingBottom: 36,
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    paddingVertical: 60,
    gap: 12,
  },
  connectingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "500",
  },
});