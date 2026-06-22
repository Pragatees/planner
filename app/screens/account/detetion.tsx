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
    onSubmitEditing?: () => void;
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
    onSubmitEditing,
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
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={onSubmitEditing}
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

const DeleteAccountModal: React.FC<Props> = memo(({ visible, onClose }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const clearFields = useCallback(() => {
        setPassword('');
        setShowPasswordModal(false);
    }, []);

    const handleClose = useCallback(() => {
        clearFields();
        onClose();
    }, [clearFields, onClose]);

    // Step 1: Show confirmation alert
    const handleDelete = useCallback(() => {
        Alert.alert(
            'Delete Account',
            'This action cannot be undone. All your tasks and account data will be permanently deleted.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Step 2: Open password verification modal
                        setShowPasswordModal(true);
                    },
                },
            ]
        );
    }, []);

    // Step 3: Verify password and delete account
    const verifyAndDelete = useCallback(async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
                'https://life-os-backend-1ozl.onrender.com/api/users/account',
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Account Deleted',
                    data.message || 'Your account has been deleted successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                await AsyncStorage.removeItem('token');
                                clearFields();
                                onClose();
                                router.replace('/');
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', data.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [password, clearFields, onClose]);

    return (
        <>
            {/* Main Modal - Delete Account */}
            <Modal
                visible={visible && !showPasswordModal}
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
                                <View style={styles.iconBadge}>
                                    <Ionicons name="trash-outline" size={32} color="#EF4444" />
                                </View>
                                <Text style={styles.title}>Delete Account</Text>
                                <Text style={styles.subtitle}>
                                    This action is permanent and cannot be undone.
                                </Text>
                            </View>

                            <View style={styles.warningCard}>
                                <Ionicons name="warning-outline" size={22} color="#EF4444" />
                                <Text style={styles.warningText}>
                                    All your tasks, projects, and account data will be permanently deleted.
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
                                    style={styles.deleteButton}
                                    disabled={loading}
                                    onPress={handleDelete}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>

            {/* Password Verification Modal */}
            <Modal
                visible={showPasswordModal}
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
                        onPress={() => {
                            if (!loading) {
                                setShowPasswordModal(false);
                                setPassword('');
                            }
                        }}
                    >
                        <View style={styles.container}>
                            <View style={styles.handle} />

                            <View style={styles.header}>
                                <View style={[styles.iconBadge, styles.iconBadgeDanger]}>
                                    <Ionicons name="lock-closed-outline" size={32} color="#EF4444" />
                                </View>
                                <Text style={[styles.title, styles.titleDanger]}>
                                    Verify Identity
                                </Text>
                                <Text style={styles.subtitle}>
                                    Enter your password to confirm account deletion.
                                </Text>
                            </View>

                            <View style={styles.warningCard}>
                                <Ionicons name="warning-outline" size={22} color="#EF4444" />
                                <Text style={styles.warningText}>
                                    This will permanently delete your account and all associated data.
                                </Text>
                            </View>

                            <PasswordField
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                isVisible={passwordVisible}
                                onToggleVisibility={setPasswordVisible}
                                editable={!loading}
                                autoFocus={true}
                                placeholder="Enter your password"
                                onSubmitEditing={verifyAndDelete}
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    disabled={loading}
                                    onPress={() => {
                                        setShowPasswordModal(false);
                                        setPassword('');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
                                    disabled={loading}
                                    onPress={verifyAndDelete}
                                    activeOpacity={0.7}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#F8FAFC" size="small" />
                                    ) : (
                                        <Text style={styles.deleteButtonText}>Confirm Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
});

DeleteAccountModal.displayName = 'DeleteAccountModal';

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
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconBadgeDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    title: {
        color: '#EF4444',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    titleDanger: {
        color: '#EF4444',
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 12,
        letterSpacing: 0.2,
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.15)',
        marginBottom: 20,
    },
    warningText: {
        color: '#F8FAFC',
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
        letterSpacing: 0.2,
        fontWeight: '500',
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
    deleteButton: {
        flex: 2,
        backgroundColor: '#EF4444',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    deleteButtonDisabled: {
        opacity: 0.6,
    },
    deleteButtonText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default DeleteAccountModal;