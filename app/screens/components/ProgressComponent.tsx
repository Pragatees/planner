import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
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
  warning: "#F59E0B",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
  error: "#EF4444",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Task = {
  id: string;
  taskName: string;
  taskDate: string;
  taskTime: string;
  completed: boolean;
};

type Props = {
  /** Optional: pass tasks directly from a parent to avoid a duplicate fetch */
  tasks?: Task[];
  /** Optional: bump this value to force a refetch (e.g. after adding/completing a task) */
  refreshTrigger?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAccentColor(pct: number): string {
  if (pct >= 80) return C.success;
  if (pct >= 40) return C.accent;
  if (pct > 0)   return C.warning;
  return C.border;
}

function getMotivation(pct: number): string {
  if (pct === 100) return "All done — incredible work! 🎉";
  if (pct >= 80)   return "Almost there — keep pushing!";
  if (pct >= 50)   return "Halfway through — stay focused.";
  if (pct >= 20)   return "Good start — keep the momentum.";
  if (pct > 0)     return "You&apos;ve begun — that&apos;s what counts.";
  return "Ready to conquer the day?";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={[sc.card, { borderColor: color + "33" }]}>
      <View style={[sc.iconWrap, { backgroundColor: color + "18", borderColor: color + "33" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "flex-start",
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProgressComponent({ tasks: externalTasks, refreshTrigger }: Props) {
  const [tasks, setTasks] = useState<Task[]>(externalTasks ?? []);
  const [loading, setLoading] = useState(externalTasks === undefined);

  const fetchTasks = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_URL}/tasks/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use externally supplied tasks when available, otherwise self-fetch.
  useEffect(() => {
    if (externalTasks !== undefined) {
      setTasks(externalTasks);
      setLoading(false);
    } else {
      fetchTasks();
    }
  }, [externalTasks, refreshTrigger, fetchTasks]);

  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const remaining      = totalTasks - completedTasks;
  const percentage     = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const accentColor    = getAccentColor(percentage);

  // Animated progress bar
  const barAnim     = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(barAnim, {
        toValue: percentage,
        duration: 900,
        useNativeDriver: false,
      }),
    ]).start();
  }, [percentage, barAnim, fadeAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <View style={[s.card, s.loadingCard]}>
        <Text style={s.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[s.card, { opacity: fadeAnim }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="trending-up-outline" size={18} color={C.accent} />
          </View>
          <View>
            <Text style={s.title}>Today&apos;s Progress</Text>
            <Text style={s.subtitle}>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
        </View>

        {/* Percentage badge */}
        <View style={[s.badge, { backgroundColor: accentColor + "18", borderColor: accentColor + "44" }]}>
          <Text style={[s.badgeText, { color: accentColor }]}>{percentage}%</Text>
        </View>
      </View>

      {/* ── Stat Cards ── */}
      <View style={s.statsRow}>
        <StatCard icon="checkmark-circle-outline" label="Completed" value={completedTasks} color={C.success} />
        <StatCard icon="time-outline"             label="Remaining"  value={remaining}       color={C.warning} />
        <StatCard icon="list-outline"             label="Total"      value={totalTasks}      color={C.accent}  />
      </View>

      {/* ── Progress Bar ── */}
      <View style={s.barSection}>
        <View style={s.barTrack}>
          {/* Segmented tick marks */}
          {[25, 50, 75].map((tick) => (
            <View
              key={tick}
              style={[s.tick, { left: `${tick}%` as any }]}
            />
          ))}
          <Animated.View
            style={[
              s.barFill,
              {
                width: barWidth,
                backgroundColor: accentColor,
                shadowColor: accentColor,
              },
            ]}
          />
        </View>

        {/* Tick labels */}
        <View style={s.tickLabels}>
          <Text style={s.tickLabel}>0</Text>
          <Text style={s.tickLabel}>25</Text>
          <Text style={s.tickLabel}>50</Text>
          <Text style={s.tickLabel}>75</Text>
          <Text style={s.tickLabel}>100</Text>
        </View>
      </View>

      {/* ── Motivation ── */}
      <View style={s.motivationRow}>
        <Ionicons
          name={percentage === 100 ? "star" : "flash-outline"}
          size={13}
          color={accentColor}
        />
        <Text style={[s.motivationText, { color: accentColor }]}>
          {getMotivation(percentage)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },

  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  loadingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  // Progress bar
  barSection: {
    marginBottom: 14,
  },
  barTrack: {
    height: 10,
    backgroundColor: C.bg,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: C.border,
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
  },
  tick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: C.border,
    opacity: 0.5,
    zIndex: 1,
  },
  tickLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 1,
  },
  tickLabel: {
    fontSize: 9,
    color: C.textSecondary,
    opacity: 0.5,
    fontWeight: "500",
  },

  // Motivation
  motivationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  motivationText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});