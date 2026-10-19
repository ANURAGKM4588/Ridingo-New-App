/**
 * PermissionPromptModal.jsx
 * 
 * Production-ready React Native Just-In-Time (JIT) Permission Prompt & Handler.
 * Adheres strictly to Apple Human Interface Guidelines and Google Play Permission Policies:
 * - Prompts users natively right before a feature is accessed (Contextual Requesting)
 * - Transparent rationale for Location, Camera, and Gallery / Photos
 * - Robust handling of all states: 'granted', 'denied', 'blocked', 'unavailable'
 * - 1-tap redirect to iOS Settings / Android App Details when blocked
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Dimensions,
  Animated
} from 'react-native';

import {
  PERMISSION_TYPES,
  PERMISSION_RESULTS,
  checkAppPermission,
  requestAppPermission,
  openAppSettingsGuide
} from '../../services/nativePermissionsService';

const { width } = Dimensions.get('window');

/**
 * Feature Configurations (Icons, Title, Explanation, and Requirement Rationale)
 */
const PERMISSION_CONFIGS = {
  [PERMISSION_TYPES.LOCATION_FOREGROUND]: {
    icon: 'GPS',
    name: 'Device Location',
    title: 'Enable Location Services',
    description:
      'Ridingo uses your precise GPS location to set accurate pickup coordinates, display nearby available drivers, and calculate optimal route navigation.',
    settingsMsg:
      'Location access is currently blocked in device settings. To select your pickup spot or navigate, please enable Location in Settings.'
  },
  [PERMISSION_TYPES.CAMERA]: {
    icon: 'CAM',
    name: 'Camera Access',
    title: 'Camera Access Required',
    description:
      'Camera permission is required to photograph your Commercial Driving Licence, Aadhaar Card for KYC verification, and record vehicle condition inspections.',
    settingsMsg:
      'Camera access is currently blocked. To capture documents or vehicle condition photos, please enable Camera in Settings.'
  },
  [PERMISSION_TYPES.PHOTO_LIBRARY]: {
    icon: 'DOC',
    name: 'Photos & Gallery',
    title: 'Allow Photo Gallery Access',
    description:
      'Allow Ridingo access to your photo library to upload KYC document scans, vehicle inspection records, or set your profile picture.',
    settingsMsg:
      'Gallery access is currently blocked. To upload photos from your library, please allow Photos access in Settings.'
  }
};

/**
 * PermissionPromptModal Component
 */
export default function PermissionPromptModal({
  visible,
  feature = PERMISSION_TYPES.LOCATION_FOREGROUND,
  role = 'user', // 'user' | 'driver'
  isBlocked = false,
  isDarkMode = false,
  onProceed,
  onCancel
}) {
  const config = PERMISSION_CONFIGS[feature] || PERMISSION_CONFIGS[PERMISSION_TYPES.LOCATION_FOREGROUND];

  const colors = {
    overlay: 'rgba(0, 0, 0, 0.65)',
    card: isDarkMode ? '#1E232A' : '#FFFFFF',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    primaryBtn: '#FFC70A',
    primaryText: '#111827',
    secondaryBtn: isDarkMode ? '#2A303C' : '#F3F4F6',
    secondaryText: isDarkMode ? '#D1D5DB' : '#374151',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
    badgeBg: isDarkMode ? 'rgba(255,199,10,0.15)' : 'rgba(255,199,10,0.18)'
  };

  const handleOpenSettings = async () => {
    try {
      await openAppSettingsGuide(feature, role);
    } catch (e) {
      Linking.openSettings();
    }
    if (onCancel) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border
            }
          ]}
        >
          {/* Header Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: colors.badgeBg }]}>
            <Text style={styles.badgeEmoji}>{config.icon}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isBlocked ? `${config.name} Blocked` : config.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.subText }]}>
            {isBlocked ? config.settingsMsg : config.description}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            {isBlocked ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primaryBtn }]}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
                  Open Device Settings
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primaryBtn }]}
                onPress={onProceed}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
                  Continue & Allow
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.secondaryBtn }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.secondaryText }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Custom React Native Hook for Just-In-Time Permission Checking & Execution
 * 
 * Usage:
 * const { requestPermissionWithPrompt, PermissionModalComponent } = useFeaturePermission('user');
 * 
 * // Trigger right before action:
 * const handleTakePhoto = () => {
 *   requestPermissionWithPrompt(PERMISSION_TYPES.CAMERA, () => {
 *     // Action executed when granted
 *     launchCamera();
 *   });
 * };
 */
export function useFeaturePermission(role = 'user', isDarkMode = false) {
  const [modalState, setModalState] = useState({
    visible: false,
    feature: PERMISSION_TYPES.LOCATION_FOREGROUND,
    isBlocked: false,
    pendingAction: null
  });

  const requestPermissionWithPrompt = useCallback(
    async (feature, onGrantedAction) => {
      // 1. Check existing permission status
      const status = await checkAppPermission(feature, role);

      // If already granted, proceed immediately without prompting
      if (status === PERMISSION_RESULTS.GRANTED || status === PERMISSION_RESULTS.LIMITED) {
        if (onGrantedAction) onGrantedAction();
        return;
      }

      // If previously blocked, show Open Settings prompt
      if (status === PERMISSION_RESULTS.BLOCKED) {
        setModalState({
          visible: true,
          feature,
          isBlocked: true,
          pendingAction: null
        });
        return;
      }

      // If denied (can show prompt), show custom pre-prompt explanation dialog
      setModalState({
        visible: true,
        feature,
        isBlocked: false,
        pendingAction: async () => {
          setModalState((prev) => ({ ...prev, visible: false }));
          // Request native system-level prompt
          const reqStatus = await requestAppPermission(feature, role, { showAlertOnBlocked: false });

          if (reqStatus === PERMISSION_RESULTS.GRANTED || reqStatus === PERMISSION_RESULTS.LIMITED) {
            if (onGrantedAction) onGrantedAction();
          } else if (reqStatus === PERMISSION_RESULTS.BLOCKED) {
            // User selected "Don't ask again" / permanently denied
            setModalState({
              visible: true,
              feature,
              isBlocked: true,
              pendingAction: null
            });
          }
        }
      });
    },
    [role]
  );

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, visible: false }));
  }, []);

  const ModalComponent = (
    <PermissionPromptModal
      visible={modalState.visible}
      feature={modalState.feature}
      role={role}
      isBlocked={modalState.isBlocked}
      isDarkMode={isDarkMode}
      onProceed={() => {
        if (modalState.pendingAction) modalState.pendingAction();
      }}
      onCancel={closeModal}
    />
  );

  return {
    requestPermissionWithPrompt,
    PermissionModalComponent: ModalComponent,
    closeModal
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: Math.min(width - 48, 360),
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20
      },
      android: {
        elevation: 8
      }
    })
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  badgeEmoji: {
    fontSize: 32
  },
  title: {
    fontSize: 18.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500'
  },
  buttonStack: {
    width: '100%',
    gap: 10
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFC70A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
