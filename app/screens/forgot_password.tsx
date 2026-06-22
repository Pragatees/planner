import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";

const API_URL =
  "https://life-os-backend-1ozl.onrender.com/api/auth/forgot-password";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert("Validation", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Validation", "Enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      await axios.post(API_URL, {
        email: trimmedEmail,
      });

      Alert.alert(
        "Success",
        "Verification code sent successfully",
        [
          {
            text: "Continue",
            onPress: () =>
              router.push({
                pathname: "/screens/verify_otp",
                params: {
                  email: trimmedEmail,
                },
              }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          "Failed to send verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>

        <Text style={styles.subtitle}>
          Enter your registered email address to receive a verification code.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          disabled={loading}
          onPress={handleSendOtp}
        >
          {loading ? (
            <ActivityIndicator color="#F8FAFC" />
          ) : (
            <Text style={styles.buttonText}>
              Send OTP
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },

  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },

  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },

  backText: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
});