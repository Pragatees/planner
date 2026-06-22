import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
type Task = {
  id: string;
  taskName: string;
  taskDate: string;
  taskTime: string;
  completed: boolean;
};

type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  achieved: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getProgressColor(percentage: number): string {
  if (percentage > 70) return C.success;
  if (percentage >= 40) return C.warning;
  return C.danger;
}

function getMotivationalMessage(percentage: number, total: number): string {
  if (total === 0) return "Let's start your day strong.";
  if (percentage === 0) return "Let's start your day strong.";
  if (percentage === 100) return "Outstanding! You completed everything today.";
  if (percentage >= 70) return "Excellent work. Keep going.";
  if (percentage >= 40) return "You're making good progress.";
  return "Every small step counts.";
}

function buildAchievements(completed: number, percentage: number): Achievement[] {
  return [
    {
      id: "productive-day",
      icon: "flame",
      title: "Productive Day",
      description: "Complete 5+ tasks",
      achieved: completed >= 5,
    },
    {
      id: "consistency-champion",
      icon: "flash",
      title: "Consistency Champion",
      description: "Reach 70% completion",
      achieved: percentage >= 70,
    },
    {
      id: "perfect-day",
      icon: "trophy",
      title: "Perfect Day",
      description: "Complete 100% of tasks",
      achieved: percentage === 100,
    },
  ];
}

// ─── Circular Progress Ring ──────────────────────────────────────────────────
const RING_SIZE = 180;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ProgressRing({ percentage }: { percentage: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);
  const color = getProgressColor(percentage);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={ring.wrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={C.border}
          strokeWidth={STROKE_WIDTH}
          fill="transparent"
          opacity={0.35}
        />
        {/* Progress */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="transparent"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>

      <View style={ring.center}>
        <Text style={[ring.percentage, { color }]}>{displayValue}%</Text>
        <Text style={ring.label}>Completed</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentage: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
});

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={stat.pill}>
      <View style={[stat.iconWrap, { backgroundColor: color + "1A", borderColor: color + "33" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

// ─── Achievement Badge ────────────────────────────────────────────────────────
function AchievementBadge({ achievement, index }: { achievement: Achievement; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: 120 * index,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: 120 * index,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
    ]).start();
  }, []);

  const { achieved } = achievement;

  return (
    <Animated.View
      style={[
        badge.card,
        achieved && badge.cardAchieved,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View
        style={[
          badge.iconWrap,
          {
            backgroundColor: achieved ? C.accent + "22" : C.surfaceAlt,
            borderColor: achieved ? C.accent + "55" : C.border,
          },
        ]}
      >
        <Ionicons
          name={achievement.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={achieved ? C.accent : C.textSecondary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[badge.title, !achieved && badge.titleLocked]}>{achievement.title}</Text>
        <Text style={badge.desc}>{achievement.description}</Text>
      </View>
      {achieved && (
        <View style={badge.checkWrap}>
          <Ionicons name="checkmark-circle" size={18} color={C.success} />
        </View>
      )}
    </Animated.View>
  );
}

const badge = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    opacity: 0.6,
  },
  cardAchieved: {
    opacity: 1,
    borderColor: C.accent + "40",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 2,
  },
  titleLocked: {
    color: C.textSecondary,
  },
  desc: {
    fontSize: 12,
    color: C.textSecondary,
  },
  checkWrap: {
    marginLeft: 4,
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconWrap}>
        <Ionicons name="sparkles-outline" size={32} color={C.accent} />
      </View>
      <Text style={empty.title}>No tasks scheduled today.</Text>
      <Text style={empty.subtitle}>Plan something meaningful to begin your journey.</Text>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 32,
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
    lineHeight: 19,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProgressComponentProps {
  /** Optional: pass tasks from a parent to avoid a duplicate fetch */
  tasks?: Task[];
  /** Optional: bump this value to force a refetch (e.g. after adding/completing a task) */
  refreshTrigger?: number;
}

export default function ProgressComponent({ tasks: externalTasks, refreshTrigger }: ProgressComponentProps) {
  const [tasks, setTasks] = useState<Task[]>(externalTasks ?? []);
  const [loading, setLoading] = useState(externalTasks === undefined);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

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
      setRefreshing(false);
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const message = getMotivationalMessage(percentage, totalTasks);
  const achievements = buildAchievements(completedTasks, percentage);
  const accentColor = getProgressColor(percentage);

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>Loading your progress...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.accent}
          colors={[C.accent]}
        />
      }
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Today's Progress</Text>
            <Text style={s.headerSub}>{message}</Text>
          </View>
          <View style={[s.headerBadge, { backgroundColor: accentColor + "1A", borderColor: accentColor + "40" }]}>
            <Ionicons name="trending-up" size={16} color={accentColor} />
          </View>
        </View>

        {totalTasks === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Progress Ring ── */}
            <View style={s.ringSection}>
              <ProgressRing percentage={percentage} />
            </View>

            {/* ── Stats Row ── */}
            <View style={s.statsRow}>
              <StatPill icon="list-outline" label="Total" value={totalTasks} color={C.accent} />
              <StatPill icon="checkmark-done-outline" label="Completed" value={completedTasks} color={C.success} />
              <StatPill icon="time-outline" label="Pending" value={pendingTasks} color={C.warning} />
            </View>

            {/* ── Achievements ── */}
            <View style={s.achievementsSection}>
              <Text style={s.sectionTitle}>Achievements</Text>
              {achievements.map((achievement, index) => (
                <AchievementBadge key={achievement.id} achievement={achievement} index={index} />
              ))}
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
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

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "500",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: C.textSecondary,
    maxWidth: 240,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  ringSection: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingVertical: 28,
    marginBottom: 16,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  achievementsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
});