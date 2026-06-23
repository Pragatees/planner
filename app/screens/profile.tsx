import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Switch,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Sidebar from "./components/Sidebar";

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceHigh: "#263448",
  accent: "#6366F1",
  accentSoft: "rgba(99,102,241,0.15)",
  success: "#10B981",
  successSoft: "rgba(16,185,129,0.12)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.12)",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.12)",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  completed: boolean;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAchievements(
  completed: number,
  total: number,
  pct: number
): Achievement[] {
  return [
    {
      id: "focus",
      icon: "🔥",
      title: "Focus Master",
      desc: "Complete 5 tasks in a day",
      earned: completed >= 5,
    },
    {
      id: "consistency",
      icon: "⚡",
      title: "Consistency Builder",
      desc: "Achieve 70%+ completion",
      earned: pct >= 70,
    },
    {
      id: "perfect",
      icon: "🏆",
      title: "Perfect Day",
      desc: "Complete all scheduled tasks",
      earned: total > 0 && completed === total,
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>
  );
}

function StatCard({
  value,
  label,
  color,
  delay,
}: {
  value: string;
  label: string;
  color: string;
  delay: number;
}) {
  // FIX 1: Use a ref for the Animated.Value so it's stable, and list all deps
  const animRef = useRef(new Animated.Value(0));
  const anim = animRef.current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          borderTopColor: color,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function AchievementBadge({
  achievement,
  index,
}: {
  achievement: Achievement;
  index: number;
}) {
  // FIX 2: Same pattern — stable ref + list anim and index as deps
  const animRef = useRef(new Animated.Value(0));
  const anim = animRef.current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: 300 + index * 120,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [anim, index]);

  if (!achievement.earned) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          opacity: anim,
          transform: [{ scale: anim }],
        },
      ]}
    >
      <Text style={styles.badgeIcon}>{achievement.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.badgeTitle}>{achievement.title}</Text>
        <Text style={styles.badgeDesc}>{achievement.desc}</Text>
      </View>
    </Animated.View>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.settingRow, { transform: [{ scale }] }]}>
        <View style={styles.settingIconWrap}>
          <Ionicons name={icon} size={18} color={T.accent} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
        <View style={styles.settingRight}>
          {right ?? (
            <Ionicons name="chevron-forward" size={16} color={T.textSecondary} />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileComponent() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Profile data
  const [fullName, setFullName] = useState("User");
  const [username, setUsername] = useState("-");
  const [email, setEmail] = useState("-");

  // Task stats
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  // Settings
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;

  const loadProfile = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      try {
        const res = await fetch(
          "https://life-os-backend-1ozl.onrender.com/api/auth/me",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.fullName) {
            setFullName(data.fullName);
            await AsyncStorage.setItem("fullName", data.fullName);
          }
          if (data.username) {
            setUsername(data.username);
            await AsyncStorage.setItem("username", data.username);
          }
          if (data.email) {
            setEmail(data.email);
            await AsyncStorage.setItem("email", data.email);
          }
          return;
        }
      } catch {
        // fall through to local storage
      }
    }

    const [n, u, e] = await Promise.all([
      AsyncStorage.getItem("fullName"),
      AsyncStorage.getItem("username"),
      AsyncStorage.getItem("email"),
    ]);
    if (n) setFullName(n);
    if (u) setUsername(u);
    if (e) setEmail(e);
  }, []);

  const loadTaskStats = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(
        "https://life-os-backend-1ozl.onrender.com/api/tasks/today",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const tasks: Task[] = await res.json();
        const done = tasks.filter((t) => t.completed).length;
        setTotalTasks(tasks.length);
        setCompletedTasks(done);
      }
    } catch {
      // Leave at 0
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    const [dark, notif] = await Promise.all([
      AsyncStorage.getItem("darkMode"),
      AsyncStorage.getItem("notifications"),
    ]);
    if (dark !== null) setDarkMode(dark === "true");
    if (notif !== null) setNotifications(notif === "true");
  }, []);

  // FIX 3: Wrap initLoad in useCallback so it can be safely listed as a dep
  const initLoad = useCallback(async () => {
    try {
      setError(false);
      await Promise.all([loadProfile(), loadTaskStats(), loadPreferences()]);
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(avatarScale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadTaskStats, loadPreferences, headerAnim, avatarScale]);

  useEffect(() => {
    initLoad();
  }, [initLoad]);

  const toggleDarkMode = async (val: boolean) => {
    setDarkMode(val);
    await AsyncStorage.setItem("darkMode", String(val));
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifications(val);
    await AsyncStorage.setItem("notifications", String(val));
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out from Life OS?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(["token", "username", "fullName", "email"]);
            router.replace("/screens/login");
          },
        },
      ]
    );
  };

  // ── Derived ──
  const pct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const initials = getInitials(fullName);
  const achievements = getAchievements(completedTasks, totalTasks, pct);
  const earnedAchievements = achievements.filter((a) => a.earned);

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={T.textSecondary} />
        <Text style={styles.errorTitle}>Unable to load profile information.</Text>
        <Text style={styles.errorSub}>Please try again later.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initLoad}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ──
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={26} color={T.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Profile</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* ── Profile Hero ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[styles.avatarWrap, { transform: [{ scale: avatarScale }] }]}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.heroName}>{fullName}</Text>
          <Text style={styles.heroUsername}>@{username}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          {/* Accent pill */}
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Active</Text>
          </View>
        </Animated.View>

        {/* ── Productivity Stats ── */}
        <SectionLabel text="Today's Productivity" />
        <View style={styles.statsRow}>
          <StatCard
            value={String(completedTasks)}
            label="Completed"
            color={T.success}
            delay={0}
          />
          <StatCard
            value={String(totalTasks)}
            label="Total Tasks"
            color={T.accent}
            delay={100}
          />
          <StatCard
            value={`${pct}%`}
            label="Score"
            color={T.warning}
            delay={200}
          />
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor:
                    pct >= 70 ? T.success : pct >= 40 ? T.warning : T.danger,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{pct}% of today&apos;s tasks done</Text>
        </View>

        {/* ── Achievements ── */}
        {earnedAchievements.length > 0 && (
          <>
            <SectionLabel text="Achievements" />
            {earnedAchievements.map((a, i) => (
              <AchievementBadge key={a.id} achievement={a} index={i} />
            ))}
          </>
        )}

        {/* ── Settings ── */}
        <SectionLabel text="Settings" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon="person-outline"
            label="Account"
            onPress={() => router.push("/screens/account_setting")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="color-palette-outline"
            label="Appearance"
            right={
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: T.border, true: T.accent }}
                thumbColor={T.textPrimary}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            right={
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: T.border, true: T.accent }}
                thumbColor={T.textPrimary}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() =>
              Alert.alert("Coming Soon", "Security settings will be available in V2.")
            }
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={T.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: T.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  errorSub: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: T.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.accent,
  },
  retryText: {
    color: T.accent,
    fontWeight: "600",
    fontSize: 15,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 8,
  },
  topBarTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatarWrap: {
    marginBottom: 18,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: T.accent,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#312E81",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: T.textPrimary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroName: {
    color: T.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroUsername: {
    color: T.accent,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  heroEmail: {
    color: T.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: T.successSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.success,
  },
  pillText: {
    color: T.success,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Section label
  sectionLabel: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 28,
    marginBottom: 12,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 2,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  // Progress
  progressWrap: {
    marginTop: 14,
    gap: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: T.border,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  progressLabel: {
    color: T.textSecondary,
    fontSize: 12,
    textAlign: "right",
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeTitle: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  badgeDesc: {
    color: T.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Settings
  settingsCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: T.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  settingRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 64,
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: T.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  logoutText: {
    color: T.danger,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});