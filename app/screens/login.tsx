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
};

// ─── Decorative accent mark (replaces complex icon) ───────────────────────────
function LogoMark() {
  return (
    <View style={logo.wrap}>
      {/* Outer ring */}
      <View style={logo.ring} />
      {/* Inner accent square */}
      <View style={logo.inner}>
        <View style={logo.dot} />
        <View style={[logo.dot, logo.dotAlt]} />
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  ring: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.accentSoft,
    opacity: 0.5,
  },
  inner: {
    width: 38,
    height: 38,
    backgroundColor: C.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  dotAlt: {
    backgroundColor: C.accentSoft,
    width: 10,
    height: 10,
    borderRadius: 3,
    marginTop: 8,
  },
});

// ─── Input component with optional right icon ─────────────────────────────────
interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  rightElement?: React.ReactNode;
}

function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = "none",
  editable = true,
  rightElement,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.borderFocus],
  });

  return (
    <Animated.View
      style={[
        field.wrapper,
        { borderColor },
        focused && field.wrapperFocused,
      ]}
    >
      <TextInput
        style={field.input}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        editable={editable}
        onFocus={handleFocus}
        onBlur={handleBlur}
        selectionColor={C.accent}
      />
      {rightElement && (
        <View style={field.rightSlot}>{rightElement}</View>
      )}
    </Animated.View>
  );
}

const field = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 18,
  },
  wrapperFocused: {
    backgroundColor: C.surfaceAlt,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
    paddingVertical: 16,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  rightSlot: {
    paddingLeft: 10,
    justifyContent: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const responseText = await response.text();
      console.log("Response Status:", response.status);
      console.log("Response Body:", responseText);

      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = {};
      }

      if (!response.ok) {
        Alert.alert(
          "Login Failed",
          data.message || `Server returned ${response.status}`
        );
        return;
      }

      try {
        if (data.accessToken) {
          await AsyncStorage.setItem("token", data.accessToken);
        }
        if (data.username) {
          await AsyncStorage.setItem("username", data.username);
        }
        await AsyncStorage.setItem(
          "fullName",
          data.fullName || data.username || "User"
        );
      } catch (storageError) {
        console.log("Storage Error:", storageError);
        Alert.alert(
          "Storage Error",
          "Login successful, but data could not be saved locally."
        );
        return;
      }

      Alert.alert("Success", `Welcome ${data.fullName || data.username || "User"}!`);
      router.replace("/screens/dashboard");
    } catch (error) {
      console.log("Network Error:", error);
      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

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
            style={[
              s.hero,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <LogoMark />

            <Text style={s.appName}>Life OS</Text>
            <Text style={s.tagline}>Organize.{"  "}Focus.{"  "}Grow.</Text>
          </Animated.View>

          {/* ── Form card ── */}
          <Animated.View
            style={[
              s.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text
  style={[
    s.cardTitle,
    { textAlign: "center" },
  ]}
>
  Log in to Continue
</Text> <Text style={s.cardSubtitle}>
                                     Continue to your workspace
            </Text>

            <View style={s.fieldGroup}>
              <InputField
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
              />

              <InputField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Forgot password */}
            <TouchableOpacity
  style={s.forgotWrap}
  disabled={loading}
  activeOpacity={0.7}
  onPress={() => router.push("/screens/forgot_password")}
>
  <Text style={s.forgotText}>Forgot password?</Text>
</TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.loginBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Sign up */}
            <TouchableOpacity
              style={s.signupBtn}
              onPress={() => router.push("/screens/register")}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={s.signupBtnText}>Create an account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View style={[s.footer, { opacity: fadeAnim }]}>
            <Text style={s.footerText}>
              By signing in, you agree to our{" "}
              <Text style={s.footerLink}>Terms</Text>
              {" & "}
              <Text style={s.footerLink}>Privacy</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },

  // Hero
  hero: {
    alignItems: "center",
    marginBottom: 36,
  },
  appName: {
    fontSize: 36,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: C.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 8,
    fontWeight: "500",
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E3A5F22",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    // Elevation (Android)
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    marginBottom: 28,
    fontWeight: "400",
  },
  fieldGroup: {
    marginBottom: 4,
  },

  // Forgot
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 2,
  },
  forgotText: {
    fontSize: 13,
    color: C.accent,
    fontWeight: "500",
  },

  // Login button
  loginBtn: {
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // Sign up button
  signupBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  signupBtnText: {
    fontSize: 15,
    color: C.textPrimary,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: C.accent,
    fontWeight: "500",
  },
});