import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
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
  warning: "#F59E0B",
  inputBg: "#1E293B",
};

// ─── Logo Mark (matches LoginScreen) ─────────────────────────────────────────
function LogoMark() {
  return (
    <View style={logo.wrap}>
      <View style={logo.ring} />
      <View style={logo.inner}>
        <View style={logo.dot} />
        <View style={[logo.dot, logo.dotAlt]} />
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    alignSelf: "center",
  },
  ring: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.accentSoft,
    opacity: 0.5,
  },
  inner: {
    width: 34,
    height: 34,
    backgroundColor: C.surface,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  dotAlt: {
    backgroundColor: C.accentSoft,
    marginTop: 7,
  },
});

// ─── Password Strength ────────────────────────────────────────────────────────
function getPasswordStrength(pwd: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (pwd.length === 0) return { level: 0, label: "", color: C.border };
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [pwd.length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score <= 2) return { level: 1, label: "Weak", color: C.error };
  if (score <= 3) return { level: 2, label: "Medium", color: C.warning };
  return { level: 3, label: "Strong", color: C.success };
}

interface StrengthBarProps {
  password: string;
}

function StrengthBar({ password }: StrengthBarProps) {
  const { level, label, color } = getPasswordStrength(password);
  if (password.length === 0) return null;

  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              sb.bar,
              {
                backgroundColor: i <= level ? color : C.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -8,
    marginBottom: 14,
    gap: 10,
    paddingHorizontal: 2,
  },
  bars: {
    flexDirection: "row",
    gap: 5,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    minWidth: 44,
    textAlign: "right",
  },
});

// ─── InputField ───────────────────────────────────────────────────────────────
interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  editable?: boolean;
  rightElement?: React.ReactNode;
  error?: string;
}

function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  editable = true,
  rightElement,
  error,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? C.error : C.border, C.borderFocus],
  });

  return (
    <View style={fi.container}>
      <Animated.View
        style={[
          fi.wrapper,
          { borderColor },
          focused && fi.wrapperFocused,
          !!error && fi.wrapperError,
        ]}
      >
        <TextInput
          style={fi.input}
          placeholder={placeholder}
          placeholderTextColor={C.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={C.accent}
        />
        {rightElement && <View style={fi.rightSlot}>{rightElement}</View>}
      </Animated.View>
      {!!error && <Text style={fi.errorText}>{error}</Text>}
    </View>
  );
}

const fi = StyleSheet.create({
  container: { marginBottom: 14 },
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 18,
  },
  wrapperFocused: { backgroundColor: C.surfaceAlt },
  wrapperError: { borderColor: C.error },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
    paddingVertical: 15,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  rightSlot: { paddingLeft: 10, justifyContent: "center" },
  errorText: {
    fontSize: 12,
    color: C.error,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: "500",
  },
});

// ─── Validation Helpers ───────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!username.trim()) newErrors.username = "Username is required";
    else if (username.trim().length < 3) newErrors.username = "Must be at least 3 characters";

    if (!email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(email.trim())) newErrors.email = "Enter a valid email address";

    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Must be at least 6 characters";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Account Created",
          data.message || "Your account has been created successfully.",
          [{ text: "Sign In", onPress: () => router.replace("/screens/login") }]
        );
      } else {
        Alert.alert("Registration Failed", data.message || "Something went wrong.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const eyeButton = (visible: boolean, toggle: () => void) => (
    <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons
        name={visible ? "eye-outline" : "eye-off-outline"}
        size={20}
        color={C.textSecondary}
      />
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <Animated.View
            style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <LogoMark />
            <Text style={s.appName}>Life OS</Text>
            <Text style={s.heroTitle}>Start Your Journey</Text>
            <Text style={s.heroSubtitle}>
              Build better habits.{"  "}Achieve your goals.
            </Text>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View
            style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={s.cardTitle}>Create account</Text>
            <Text style={s.cardSubtitle}>Fill in the details to get started</Text>

            {/* Full Name */}
            <InputField
              placeholder="Full Name"
              value={fullName}
              onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: "" })); }}
              autoCapitalize="words"
              editable={!loading}
              error={errors.fullName}
            />

            {/* Username */}
            <InputField
              placeholder="Username"
              value={username}
              onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: "" })); }}
              autoCapitalize="none"
              editable={!loading}
              error={errors.username}
            />

            {/* Email */}
            <InputField
              placeholder="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              error={errors.email}
            />

            {/* Password */}
            <InputField
              placeholder="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
              secureTextEntry={!showPassword}
              editable={!loading}
              error={errors.password}
              rightElement={eyeButton(showPassword, () => setShowPassword((v) => !v))}
            />
            <StrengthBar password={password} />

            {/* Confirm Password */}
            <InputField
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
              secureTextEntry={!showConfirm}
              editable={!loading}
              error={errors.confirmPassword}
              rightElement={eyeButton(showConfirm, () => setShowConfirm((v) => !v))}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <TouchableOpacity
              style={s.signinRow}
              onPress={() => router.replace("/screens/login")}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Text style={s.signinText}>
                Already have an account?{"  "}
                <Text style={s.signinLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View style={[s.footer, { opacity: fadeAnim }]}>
            <Text style={s.footerText}>
              By creating an account, you agree to our{" "}
              <Text style={s.footerLink}>Terms</Text>
              {" & "}
              <Text style={s.footerLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Hero
  hero: { alignItems: "center", marginBottom: 28 },
  appName: {
    fontSize: 30,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    letterSpacing: 0.3,
    textAlign: "center",
    fontWeight: "400",
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E3A5F22",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 24,
    fontWeight: "400",
  },

  // Submit
  submitBtn: {
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Sign in row
  signinRow: { marginTop: 22, alignItems: "center" },
  signinText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
  },
  signinLink: {
    color: C.accent,
    fontWeight: "600",
  },

  // Footer
  footer: { marginTop: 28, alignItems: "center" },
  footerText: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  footerLink: { color: C.accent, fontWeight: "500" },
});