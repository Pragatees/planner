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
    placeholder?: string;
}

const PasswordField = memo<PasswordFieldProps>(({
    label,
    value,
    onChangeText,
    isVisible,
    onToggleVisibility,
    editable = true,
    autoFocus = false,
    placeholder,
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
                    placeholder={placeholder || `Enter ${label.toLowerCase()}`}
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

// Email Field Component
interface EmailFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    editable?: boolean;
    autoFocus?: boolean;
}

const EmailField = memo<EmailFieldProps>(({
    label,
    value,
    onChangeText,
    editable = true,
    autoFocus = false,
}) => {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={editable}
                    autoFocus={autoFocus}
                    returnKeyType="done"
                    blurOnSubmit={true}
                />
                <View style={styles.emailIconContainer}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                </View>
            </View>
        </View>
    );
});

EmailField.displayName = 'EmailField';

// Main Modal Component
interface Props {
    visible: boolean;
    onClose: () => void;
}

const EmailChangeModal: React.FC<Props> = memo(({ visible, onClose }) => {
    const [password, setPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const clearFields = useCallback(() => {
        setPassword('');
        setNewEmail('');
        setIsVerified(false);
    }, []);

    const handleClose = useCallback(() => {
        clearFields();
        onClose();
    }, [clearFields, onClose]);

    const verifyPassword = useCallback(async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
                'https://life-os-backend-1ozl.onrender.com/api/users/verify-password',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setIsVerified(true);
            } else {
                Alert.alert('Error', data.message || 'Incorrect password');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [password]);

    const updateEmail = useCallback(async () => {
        if (!newEmail.trim()) {
            Alert.alert('Error', 'Please enter a new email');
            return;
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
                'https://life-os-backend-1ozl.onrender.com/api/users/email',
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ newEmail }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Email Updated',
                    data.message || 'Your email has been changed successfully.',
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
                Alert.alert('Error', data.message || 'Failed to update email');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [newEmail, clearFields, onClose]);

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

                        <View style={styles.header}>
                            <View style={[
                                styles.iconBadge,
                                isVerified && styles.iconBadgeSuccess,
                            ]}>
                                <Ionicons
                                    name={isVerified ? 'checkmark-circle' : 'shield-checkmark-outline'}
                                    size={28}
                                    color={isVerified ? '#10B981' : '#6366F1'}
                                />
                            </View>
                            <Text style={styles.title}>
                                {isVerified ? 'Enter New Email' : 'Verify Identity'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {isVerified
                                    ? 'Enter the new email address for your account.'
                                    : 'Confirm your password before changing your email.'}
                            </Text>
                        </View>

                        {/* Step indicator */}
                        <View style={styles.stepContainer}>
                            <View style={[styles.stepDot, !isVerified && styles.stepDotActive]} />
                            <View style={[styles.stepLine, isVerified && styles.stepLineActive]} />
                            <View style={[styles.stepDot, isVerified && styles.stepDotActive]} />
                        </View>

                        {!isVerified ? (
                            // Step 1 - Password verification
                            <>
                                <PasswordField
                                    label="Current Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    isVisible={passwordVisible}
                                    onToggleVisibility={setPasswordVisible}
                                    editable={!loading}
                                    autoFocus={true}
                                    placeholder="Enter your password"
                                />

                                <View style={styles.securityCard}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
                                    <Text style={styles.securityText}>
                                        Verify your identity by entering your current password.
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
                                        onPress={verifyPassword}
                                        activeOpacity={0.7}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#F8FAFC" size="small" />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Verify →</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Step 2 - New email
                            <>
                                <EmailField
                                    label="New Email Address"
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    editable={!loading}
                                    autoFocus={true}
                                />

                                <View style={styles.securityCard}>
                                    <Ionicons name="mail-outline" size={20} color="#6366F1" />
                                    <Text style={styles.securityText}>
                                        This email will be used for all future communications and login.
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
                                        onPress={updateEmail}
                                        activeOpacity={0.7}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#F8FAFC" size="small" />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Update Email</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
});

EmailChangeModal.displayName = 'EmailChangeModal';

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
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconBadgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    title: {
        color: '#F8FAFC',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 12,
        letterSpacing: 0.2,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#334155',
    },
    stepDotActive: {
        backgroundColor: '#6366F1',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: '#334155',
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: '#6366F1',
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
        backgroundColor: '#0F172A',
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
    emailIconContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
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
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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

export default EmailChangeModal;