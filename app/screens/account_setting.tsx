import React, { useCallback, useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import UsernameChange from "./account/username_change";
import FullNameChange from "./account/fullname_change";
import EmailChange from "./account/email_change";
import PasswordChange from "./account/password_change";
import DeleteAccount from "./account/detetion";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
    bg: "#0F172A",
    surface: "#1E293B",
    surfaceHover: "#263348",
    accent: "#6366F1",
    accentSoft: "#8B5CF6",
    success: "#10B981",
    danger: "#EF4444",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    border: "#334155",
    divider: "#2D3F55",
};

// ─── Inline SVG-style icons using simple shapes ──────────────────────────────
const Icon = ({ name, size = 18, color = C.textSecondary }: { name: string; size?: number; color?: string }) => {
    const s = size;
    switch (name) {
        case "person":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.44, height: s * 0.44, borderRadius: s * 0.22, backgroundColor: color, marginBottom: 1 }} />
                    <View style={{ width: s * 0.72, height: s * 0.38, borderRadius: s * 0.1, backgroundColor: color }} />
                </View>
            );
        case "badge":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.78, height: s * 0.55, borderRadius: 3, borderWidth: 1.5, borderColor: color, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: s * 0.4, height: 2, backgroundColor: color, marginBottom: 2 }} />
                        <View style={{ width: s * 0.5, height: 2, backgroundColor: color }} />
                    </View>
                    <View style={{ width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: color, marginTop: 1 }} />
                </View>
            );
        case "mail":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.82, height: s * 0.6, borderRadius: 3, borderWidth: 1.5, borderColor: color, alignItems: "center", justifyContent: "flex-start", paddingTop: 2 }}>
                        <View style={{ width: s * 0.55, height: 1.5, backgroundColor: color, transform: [{ rotate: "30deg" }] }} />
                    </View>
                </View>
            );
        case "shield":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.72, height: s * 0.82, borderTopLeftRadius: s * 0.36, borderTopRightRadius: s * 0.36, borderBottomLeftRadius: s * 0.1, borderBottomRightRadius: s * 0.1, borderWidth: 1.8, borderColor: color, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 1.8, height: s * 0.28, backgroundColor: color }} />
                        <View style={{ width: s * 0.28, height: 1.8, backgroundColor: color, position: "absolute" }} />
                    </View>
                </View>
            );
        case "lock":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.5, height: s * 0.26, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.25, borderWidth: 1.8, borderBottomWidth: 0, borderColor: color, marginBottom: -1 }} />
                    <View style={{ width: s * 0.7, height: s * 0.46, borderRadius: 4, borderWidth: 1.8, borderColor: color, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
                    </View>
                </View>
            );
        case "warning":
            return (
                <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 0, height: 0, borderLeftWidth: s * 0.44, borderRightWidth: s * 0.44, borderBottomWidth: s * 0.78, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color, alignItems: "center", justifyContent: "center" }} />
                    <View style={{ position: "absolute", bottom: s * 0.16, width: 2, height: s * 0.3, backgroundColor: C.bg }} />
                    <View style={{ position: "absolute", bottom: s * 0.12, width: 2, height: 2, backgroundColor: C.bg, borderRadius: 1 }} />
                </View>
            );
        case "chevron":
            return (
                <View style={{ width: s * 0.5, height: s, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.28, height: s * 0.28, borderRightWidth: 1.8, borderTopWidth: 1.8, borderColor: color, transform: [{ rotate: "45deg" }] }} />
                </View>
            );
        default:
            return <View style={{ width: s, height: s }} />;
    }
};

// ─── Pill badge for Change ────────────────────────────────────────────────────
const ChangePill = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={pillStyle.pill}
    >
        <Text style={pillStyle.label}>Change</Text>
    </TouchableOpacity>
);

const pillStyle = StyleSheet.create({
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.accent,
        backgroundColor: "rgba(99,102,241,0.10)",
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: C.accent,
        letterSpacing: 0.3,
    },
});

// ─── Setting Row ──────────────────────────────────────────────────────────────
interface SettingRowProps {
    icon: string;
    label: string;
    value: string;
    isPassword?: boolean;
    onPress: () => void;
    isLast?: boolean;
}

const SettingRow = ({ icon, label, value, isPassword, onPress, isLast }: SettingRowProps) => (
    <>
        <View style={rowStyle.row}>
            <View style={rowStyle.iconWrap}>
                <Icon name={icon} size={16} color={C.accent} />
            </View>
            <View style={rowStyle.textBlock}>
                <Text style={rowStyle.label}>{label}</Text>
                <Text style={rowStyle.value} numberOfLines={1} ellipsizeMode="tail">
                    {isPassword ? "••••••••••••" : value}
                </Text>
            </View>
            <ChangePill onPress={onPress} />
        </View>
        {!isLast && <View style={rowStyle.divider} />}
    </>
);

const rowStyle = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 18,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "rgba(99,102,241,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
    },
    textBlock: {
        flex: 1,
        marginRight: 10,
    },
    label: {
        fontSize: 11,
        color: C.textSecondary,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        fontWeight: "600",
        marginBottom: 3,
    },
    value: {
        fontSize: 15,
        color: C.textPrimary,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: C.divider,
        marginHorizontal: 18,
    },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const API_URL = "https://life-os-backend-1ozl.onrender.com";

export default function AccountSettings() {
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showFullNameModal, setShowFullNameModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fix: Wrapped loadProfile in useCallback so it has a stable reference.
    // This allows it to be safely listed in the useEffect dependency array
    // without causing an infinite re-render loop.
    // The empty array [] means this function never needs to be recreated —
    // it only reads from AsyncStorage and updates local state, no external deps.
    const loadProfile = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUsername(data.username);
                setFullName(data.fullName);
                setEmail(data.email);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }).start();
        }
    }, [fadeAnim]);

    // Fix: Added loadProfile to dependency array — now lint-clean.
    // Safe because loadProfile is memoized via useCallback above.
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} />
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={styles.loadingText}>Loading your profile…</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <View style={styles.headerIconRow}>
                            <View style={styles.headerIconBadge}>
                                <Icon name="shield" size={26} color={C.accent} />
                            </View>
                            <View style={styles.headerAccentDot} />
                        </View>
                        <Text style={styles.headerTitle}>Account Settings</Text>
                        <Text style={styles.headerSubtitle}>
                            Manage your profile and security preferences.
                        </Text>
                    </View>

                    {/* ── Section label ── */}
                    <Text style={styles.sectionLabel}>Profile</Text>

                    {/* ── Settings card ── */}
                    <View style={styles.card}>
                        <SettingRow
                            icon="person"
                            label="Username"
                            value={username}
                            onPress={() => setShowUsernameModal(true)}
                        />
                        <SettingRow
                            icon="badge"
                            label="Full Name"
                            value={fullName}
                            onPress={() => setShowFullNameModal(true)}
                        />
                        <SettingRow
                            icon="mail"
                            label="Email Address"
                            value={email}
                            onPress={() => setShowEmailModal(true)}
                        />
                        <SettingRow
                            icon="lock"
                            label="Password"
                            value=""
                            isPassword
                            onPress={() => setShowPasswordModal(true)}
                            isLast
                        />
                    </View>

                    {/* ── Security notice ── */}
                    <Text style={styles.sectionLabel}>Security</Text>
                    <View style={styles.securityCard}>
                        <View style={styles.securityIconWrap}>
                            <Icon name="shield" size={20} color={C.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.securityTitle}>Security First</Text>
                            <Text style={styles.securityDesc}>
                                For your protection, any account changes will require you to sign in again.
                            </Text>
                        </View>
                    </View>

                    {/* ── Danger zone ── */}
                    <Text style={[styles.sectionLabel, { color: C.danger }]}>Danger Zone</Text>
                    <View style={styles.dangerCard}>
                        <View style={styles.dangerTop}>
                            <View style={styles.dangerIconWrap}>
                                <Icon name="warning" size={18} color={C.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dangerTitle}>Delete Account</Text>
                                <Text style={styles.dangerDesc}>
                                    Permanently delete your account and all associated tasks. This action cannot be undone.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => setShowDeleteModal(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.deleteButtonText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 48 }} />
                </ScrollView>
            </Animated.View>

            {/* ── Modals — backend untouched ── */}
            <UsernameChange
                visible={showUsernameModal}
                onClose={() => setShowUsernameModal(false)}
                currentUsername={username}
                currentFullName={fullName}
            />
            <FullNameChange
                visible={showFullNameModal}
                onClose={() => setShowFullNameModal(false)}
                currentFullName={fullName} currentUsername={""}            />
            <EmailChange
                visible={showEmailModal}
                onClose={() => setShowEmailModal(false)}
            />
            <PasswordChange
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
            <DeleteAccount
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 20,
    },
    center: {
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 14,
        color: C.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },

    // Header
    header: {
        marginBottom: 36,
    },
    headerIconRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    headerIconBadge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: "rgba(99,102,241,0.14)",
        borderWidth: 1,
        borderColor: "rgba(99,102,241,0.28)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerAccentDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.success,
        marginLeft: 10,
        marginBottom: -16,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: "800",
        color: C.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 7,
    },
    headerSubtitle: {
        fontSize: 14,
        color: C.textSecondary,
        lineHeight: 20,
        fontWeight: "400",
    },

    // Section label
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: C.textSecondary,
        letterSpacing: 1.1,
        textTransform: "uppercase",
        marginBottom: 10,
        marginLeft: 4,
    },

    // Settings card
    card: {
        backgroundColor: C.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 28,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 6,
    },

    // Security card
    securityCard: {
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(99,102,241,0.35)",
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 28,
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    securityIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(99,102,241,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
        marginTop: 1,
    },
    securityTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: C.textPrimary,
        marginBottom: 4,
    },
    securityDesc: {
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 18,
    },

    // Danger zone
    dangerCard: {
        backgroundColor: C.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.35)",
        padding: 18,
        marginBottom: 20,
        shadowColor: C.danger,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    dangerTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 18,
    },
    dangerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(239,68,68,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
        marginTop: 1,
    },
    dangerTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: C.textPrimary,
        marginBottom: 4,
    },
    dangerDesc: {
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 18,
    },
    deleteButton: {
        backgroundColor: C.danger,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        shadowColor: C.danger,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});