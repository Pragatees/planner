import React, { useState, useCallback, memo } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Password Field Component
interface PasswordFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    isVisible: boolean;
    onToggleVisibility: (visible: boolean) => void;
    editable?: boolean;
    autoFocus?: boolean;
}

const PasswordField = memo<PasswordFieldProps>(({
    label,
    value,
    onChangeText,
    isVisible,
    onToggleVisibility,
    editable = true,
    autoFocus = false,
}) => {
    const toggleVisibility = useCallback(() => {
        onToggleVisibility(!isVisible);
    }, [isVisible, onToggleVisibility]);

    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!isVisible}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={editable}
                    autoFocus={autoFocus}
                    returnKeyType="next"
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={toggleVisibility}
                    activeOpacity={0.7}
                    disabled={!editable}
                >
                    <Ionicons
                        name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#94A3B8"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
});

PasswordField.displayName = 'PasswordField';

// Main Modal Component
interface Props {
    visible: boolean;
    onClose: () => void;
}

const PasswordChangeModal: React.FC<Props> = memo(({ visible, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentVisible, setCurrentVisible] = useState(false);
    const [newVisible, setNewVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);

    const clearFields = useCallback(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    }, []);

    const handleClose = useCallback(() => {
        clearFields();
        onClose();
    }, [clearFields, onClose]);

    const calculateStrength = useCallback((password: string): { level: 'weak' | 'medium' | 'strong'; width: number } => {
        if (!password) return { level: 'weak', width: 0 };
        
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        if (score <= 2) return { level: 'weak', width: 33 };
        if (score <= 3) return { level: 'medium', width: 66 };
        return { level: 'strong', width: 100 };
    }, []);

    const strength = calculateStrength(newPassword);

    const handleSave = useCallback(async () => {
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New password and confirm password do not match');
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
                'https://life-os-backend-1ozl.onrender.com/api/users/password',
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Password Updated',
                    data.message || 'Your password has been changed successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                await AsyncStorage.removeItem('token');
                                clearFields();
                                onClose();
                                router.replace('/screens/login');
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', data.message || 'Failed to update password');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [currentPassword, newPassword, confirmPassword, clearFields, onClose]);

    const getStrengthColor = useCallback((level: string) => {
        switch (level) {
            case 'weak': return '#EF4444';
            case 'medium': return '#F59E0B';
            case 'strong': return '#10B981';
            default: return '#334155';
        }
    }, []);

    const getStrengthLabel = useCallback((level: string) => {
        switch (level) {
            case 'weak': return 'Weak';
            case 'medium': return 'Medium';
            case 'strong': return 'Strong';
            default: return '';
        }
    }, []);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={handleClose}
                >
                    <View style={styles.container}>
                        <View style={styles.handle} />
                        
                        <Text style={styles.title}>Change Password</Text>

                        <PasswordField
                            label="Current Password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            isVisible={currentVisible}
                            onToggleVisibility={setCurrentVisible}
                            editable={!loading}
                            autoFocus={false}
                        />

                        <PasswordField
                            label="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            isVisible={newVisible}
                            onToggleVisibility={setNewVisible}
                            editable={!loading}
                            autoFocus={false}
                        />

                        {newPassword.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBarBackground}>
                                    <View
                                        style={[
                                            styles.strengthBar,
                                            {
                                                width: `${strength.width}%`,
                                                backgroundColor: getStrengthColor(strength.level),
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.strengthLabel}>
                                    Password Strength: {getStrengthLabel(strength.level)}
                                </Text>
                            </View>
                        )}

                        <PasswordField
                            label="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            isVisible={confirmVisible}
                            onToggleVisibility={setConfirmVisible}
                            editable={!loading}
                            autoFocus={false}
                        />

                        <View style={styles.securityCard}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
                            <Text style={styles.securityText}>
                                For your security, updating your password will sign you out of Life OS.
                            </Text>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                disabled={loading}
                                onPress={handleClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                                disabled={loading}
                                onPress={handleSave}
                                activeOpacity={0.7}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#F8FAFC" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
});

PasswordChangeModal.displayName = 'PasswordChangeModal';

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
    },
    container: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#F8FAFC',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 24,
        letterSpacing: 0.4,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155',
    },
    input: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        height: 54,
        fontWeight: '400',
    },
    eyeButton: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    strengthContainer: {
        marginTop: -8,
        marginBottom: 16,
    },
    strengthBarBackground: {
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 6,
    },
    strengthBar: {
        height: '100%',
        borderRadius: 2,
    },
    strengthLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    securityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
        marginBottom: 24,
        marginTop: 4,
    },
    securityText: {
        color: '#94A3B8',
        fontSize: 13,
        marginLeft: 10,
        flex: 1,
        lineHeight: 18,
        letterSpacing: 0.2,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    saveButton: {
        flex: 2,
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default PasswordChangeModal;