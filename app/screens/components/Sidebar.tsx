import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(W * 0.78, 320);

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#263348",
  surfaceHover: "#1A2740",
  accent: "#6366F1",
  accentSoft: "#8B5CF6",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
  danger: "#EF4444",
  dangerSurface: "#EF444415",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SidebarProps = {
  visible: boolean;
  onClose: () => void;
};

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "home-outline", route: "/screens/dashboard" },
  { id: "profile", label: "Profile", icon: "person-outline", route: "/screens/profile" },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ initials }: { initials: string }) {
  return (
    <View style={av.wrap}>
      <View style={av.ring} />
      <View style={av.circle}>
        <Text style={av.text}>{initials}</Text>
      </View>
    </View>
  );
}

const av = StyleSheet.create({
  wrap: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  ring: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: C.accent + "55",
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});

// ─── Nav Item ─────────────────────────────────────────────────────────────────
function NavRow({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[nr.row, active && nr.rowActive]}
      >
        {active && <View style={nr.activeBar} />}
        <View style={[nr.iconWrap, active && nr.iconWrapActive]}>
          <Ionicons name={item.icon} size={18} color={active ? C.accent : C.textSecondary} />
        </View>
        <Text style={[nr.label, active && nr.labelActive]}>{item.label}</Text>
        {active && (
          <Ionicons
            name="chevron-forward"
            size={14}
            color={C.accent}
            style={{ marginLeft: "auto" }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const nr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    position: "relative",
  },
  rowActive: { backgroundColor: C.accent + "14" },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  iconWrapActive: {
    backgroundColor: C.accent + "1A",
    borderColor: C.accent + "44",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: C.textSecondary,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: C.textPrimary,
    fontWeight: "600",
  },
});

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: "700",
        color: C.textSecondary,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        paddingHorizontal: 16,
        marginBottom: 8,
        marginTop: 4,
        opacity: 0.6,
      }}
    >
      {text}
    </Text>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: C.border,
        marginVertical: 16,
        opacity: 0.6,
      }}
    />
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ visible, onClose }: SidebarProps) {
  const [fullName, setFullName] = useState("User");
  const [username, setUsername] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [activeRoute, setActiveRoute] = useState("/screens/dashboard");

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);

  // ✅ Fix: wrap animation logic in useCallback so refs are stable dependencies
  const runOpenAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const runCloseAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setIsMounted(false));
  }, [slideAnim, overlayAnim]);

  // ✅ Fix: dependency array now includes stable callback refs
  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      runOpenAnimation();
    } else {
      runCloseAnimation();
    }
  }, [visible, runOpenAnimation, runCloseAnimation]);

  // Load persisted data
  useEffect(() => {
    (async () => {
      try {
        const [name, uname, theme] = await Promise.all([
          AsyncStorage.getItem("fullName"),
          AsyncStorage.getItem("username"),
          AsyncStorage.getItem("theme"),
        ]);
        if (name) setFullName(name);
        if (uname) setUsername(uname);
        setIsDark(theme !== "light");
      } catch (e) {
        console.log(e);
      }
    })();
  }, [visible]);

  const toggleTheme = async () => {
    try {
      const next = !isDark;
      setIsDark(next);
      await AsyncStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {
      console.log(e);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(["token", "username", "fullName"]);
            onClose();
            router.replace("/screens/login");
          } catch (e) {
            console.log(e);
          }
        },
      },
    ]);
  };

  const handleNav = (route: string) => {
    setActiveRoute(route);
    onClose();
    router.replace(route as any);
  };

  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View
        style={[s.overlay, { opacity: overlayAnim }]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sidebar panel */}
      <Animated.View
        style={[s.panel, { width: SIDEBAR_WIDTH, transform: [{ translateX: slideAnim }] }]}
      >
        {/* Close button */}
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={s.closeBtnInner}>
            <Ionicons name="close" size={18} color={C.textSecondary} />
          </View>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── User Section ── */}
          <View style={s.userSection}>
            <Avatar initials={initials} />
            <Text style={s.fullName}>{fullName}</Text>
            {username ? <Text style={s.usernameText}>@{username}</Text> : null}
            <TouchableOpacity
              style={s.viewProfileBtn}
              onPress={() => handleNav("/screens/profile")}
              activeOpacity={0.75}
            >
              <Text style={s.viewProfileText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={12} color={C.accent} />
            </TouchableOpacity>
          </View>

          <Divider />

          {/* ── Navigation ── */}
          <SectionLabel text="Navigation" />
          <View style={s.navSection}>
            {NAV_ITEMS.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                active={activeRoute === item.route}
                onPress={() => handleNav(item.route)}
              />
            ))}
          </View>

          <Divider />

          {/* ── Appearance ── */}
          <SectionLabel text="Appearance" />
          <View style={s.themeRow}>
            <View style={s.themeLeft}>
              <View style={[nr.iconWrap, { backgroundColor: C.surfaceAlt }]}>
                <Ionicons
                  name={isDark ? "moon-outline" : "sunny-outline"}
                  size={17}
                  color={C.textSecondary}
                />
              </View>
              <View>
                <Text style={s.themeLabel}>{isDark ? "Dark Theme" : "Light Theme"}</Text>
                <Text style={s.themeSubLabel}>Interface appearance</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.border, true: C.accent + "88" }}
              thumbColor={isDark ? C.accent : C.textSecondary}
              ios_backgroundColor={C.border}
            />
          </View>
        </ScrollView>

        {/* ── Logout (pinned bottom) ── */}
        <View style={s.footer}>
          <View style={{ height: 1, backgroundColor: C.border, opacity: 0.5, marginBottom: 16 }} />
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <View style={s.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={18} color={C.danger} />
            </View>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
          <Text style={s.versionText}>Life OS • v1.0.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    height: H,
    backgroundColor: C.bg,
    borderRightWidth: 1,
    borderRightColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column",
  },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  userSection: {
    alignItems: "flex-start",
    paddingBottom: 4,
  },
  fullName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "400",
    marginBottom: 10,
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accent + "14",
    borderWidth: 1,
    borderColor: C.accent + "33",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewProfileText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  navSection: { gap: 0 },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  themeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
  },
  themeSubLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.dangerSurface,
    borderWidth: 1,
    borderColor: C.danger + "22",
    marginBottom: 16,
  },
  logoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.danger + "1A",
    borderWidth: 1,
    borderColor: C.danger + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.danger,
    letterSpacing: 0.1,
  },
  versionText: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    opacity: 0.5,
    letterSpacing: 0.3,
  },
});