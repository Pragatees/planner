import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// ─── Palette (matches AccountSettings) ───────────────────────────────────────
const C = {
    bg: '#0F172A',
    surface: '#1E293B',
    accent: '#6366F1',
    danger: '#EF4444',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    borderFocus: '#6366F1',
    inputBg: '#0F172A',
};

interface Props {
    visible: boolean;
    onClose: () => void;
    currentUsername: string;
    currentFullName: string;
}

export default function UsernameChange({
    visible,
    onClose,
    currentUsername,
    currentFullName,
}: Props) {
    const [username, setUsername] = useState(currentUsername);
    const [fullName, setFullName] = useState(currentFullName);
    const [loading, setLoading] = useState(false);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [fullNameFocused, setFullNameFocused] = useState(false);

    // ── Backend logic untouched ───────────────────────────────────────────────
    const handleSave = async () => {
        if (!username.trim() || !fullName.trim()) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
                'https://life-os-backend-1ozl.onrender.com/api/users/profile',
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ username, fullName }),
                }
            );
            const data = await response.json();
            if (response.ok) {
                Alert.alert(
                    'Success',
                    data.message || 'Profile updated successfully. Please login again.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                await AsyncStorage.removeItem('token');
                                onClose();
                                router.replace('/screens/login');
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', data.message || 'Failed to update profile');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.backdrop} />

                <View style={styles.sheet}>
                    {/* Handle bar */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconBadge}>
                            {/* Person icon */}
                            <View style={styles.iconPerson}>
                                <View style={styles.iconHead} />
                                <View style={styles.iconBody} />
                            </View>
                        </View>
                        <Text style={styles.title}>Edit Profile</Text>
                        <Text style={styles.subtitle}>
                            Changes will sign you out for security.
                        </Text>
                    </View>

                    {/* Inputs */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>USERNAME</Text>
                        <TextInput
                            style={[
                                styles.input,
                                usernameFocused && styles.inputFocused,
                            ]}
                            placeholder="Enter username"
                            placeholderTextColor={C.textSecondary}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={() => setUsernameFocused(true)}
                            onBlur={() => setUsernameFocused(false)}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>FULL NAME</Text>
                        <TextInput
                            style={[
                                styles.input,
                                fullNameFocused && styles.inputFocused,
                            ]}
                            placeholder="Enter full name"
                            placeholderTextColor={C.textSecondary}
                            value={fullName}
                            onChangeText={setFullName}
                            onFocus={() => setFullNameFocused(true)}
                            onBlur={() => setFullNameFocused(false)}
                        />
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={loading}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.82}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
        backgroundColor: C.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        paddingTop: 14,
        borderTopWidth: 1,
        borderColor: C.border,
    },

    // Handle
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: 'center',
        marginBottom: 24,
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    iconBadge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(99,102,241,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    // Inline person icon
    iconPerson: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconHead: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: C.accent,
        marginBottom: 2,
    },
    iconBody: {
        width: 22,
        height: 12,
        borderRadius: 4,
        backgroundColor: C.accent,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: C.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },

    // Fields
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: C.textSecondary,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 2,
    },
    input: {
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: C.textPrimary,
        fontWeight: '500',
    },
    inputFocused: {
        borderColor: C.borderFocus,
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
    },

    // Buttons
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    cancelText: {
        color: C.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1.6,
        paddingVertical: 15,
        borderRadius: 16,
        backgroundColor: C.accent,
        alignItems: 'center',
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});