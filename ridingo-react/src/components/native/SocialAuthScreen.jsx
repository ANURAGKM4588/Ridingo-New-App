/**
 * SocialAuthScreen.jsx
 * 
 * Production-ready React Native Authentication Screen implementing:
 * - Real Native Google Sign-In with official account selection sheet
 * - Real Native Apple Authentication using Apple ID modal (iOS)
 * - Email / Phone fallback option
 * - Strict adherence to Apple Human Interface Guidelines & Google Brand Guidelines
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions
} from 'react-native';

import {
  signInWithGoogle,
  signInWithApple,
  configureGoogleSignIn,
  setupAppleRevocationListener,
  AppleButton,
  appleAuth
} from './NativeAuthService';

const { width } = Dimensions.get('window');

export default function SocialAuthScreen({
  onAuthSuccess,
  onCancel,
  onNavigateToEmail,
  isDarkMode = false,
  googleWebClientId = 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  googleIosClientId = 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com'
}) {
  const [loadingProvider, setLoadingProvider] = useState(null); // 'google' | 'apple' | null
  const [isAppleSupported, setIsAppleSupported] = useState(Platform.OS === 'ios');

  // Initialize Google client and Apple listener on mount
  useEffect(() => {
    configureGoogleSignIn({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId
    });

    if (Platform.OS === 'ios' && appleAuth) {
      setIsAppleSupported(appleAuth.isSupported);
    }

    const unsubscribe = setupAppleRevocationListener(() => {
      Alert.alert('Session Expired', 'Your Apple ID credentials were changed or revoked. Please sign in again.');
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [googleWebClientId, googleIosClientId]);

  // Handle Real Google Account Selection
  const handleGoogleSignIn = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');

    try {
      const user = await signInWithGoogle();
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess(user);
      }
    } catch (err) {
      if (!err.isCancelled) {
        Alert.alert('Google Sign-In Error', err.message || 'Could not complete Google authentication.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle Real Apple Account Selection
  const handleAppleSignIn = async () => {
    if (loadingProvider) return;
    setLoadingProvider('apple');

    try {
      const user = await signInWithApple();
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess(user);
      }
    } catch (err) {
      if (!err.isCancelled) {
        Alert.alert('Apple Sign-In Error', err.message || 'Could not complete Apple authentication.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? '#0D0E12' : '#F2F2F7'
    },
    textPrimary: {
      color: isDarkMode ? '#FFFFFF' : '#15140F'
    },
    textSecondary: {
      color: isDarkMode ? '#8E8E93' : '#68686E'
    },
    googleButton: {
      backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDarkMode ? '#2C2C2E' : '#E5E5EA'
    },
    googleText: {
      color: isDarkMode ? '#FFFFFF' : '#1F1F1F'
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.container]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Top Header & Branding */}
        <View style={styles.header}>
          <View style={styles.brandIconContainer}>
            <Text style={styles.brandIconText}>R</Text>
          </View>
          <Text style={[styles.title, dynamicStyles.textPrimary]}>Welcome to Ridingo</Text>
          <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
            Professional, on-demand chauffeurs for your personal car.
          </Text>
        </View>

        {/* Account Selection Actions */}
        <View style={styles.authActions}>
          {/* 1. Official Apple Sign-In (iOS Human Interface Guidelines) */}
          {Platform.OS === 'ios' && isAppleSupported && (
            <View style={styles.buttonWrapper}>
              {AppleButton ? (
                <AppleButton
                  buttonStyle={isDarkMode ? AppleButton.Style.WHITE : AppleButton.Style.BLACK}
                  buttonType={AppleButton.Type.SIGN_IN}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.customAppleButton, isDarkMode ? styles.appleDark : styles.appleLight]}
                  onPress={handleAppleSignIn}
                  disabled={!!loadingProvider}
                  activeOpacity={0.85}
                >
                  <Text style={styles.appleLogoIcon}></Text>
                  <Text style={[styles.customAppleText, isDarkMode ? { color: '#000' } : { color: '#FFF' }]}>
                    Sign in with Apple
                  </Text>
                </TouchableOpacity>
              )}

              {loadingProvider === 'apple' && (
                <View style={styles.buttonLoaderOverlay}>
                  <ActivityIndicator size="small" color={isDarkMode ? '#000000' : '#FFFFFF'} />
                </View>
              )}
            </View>
          )}

          {/* 2. Official Google Sign-In (Google Identity Guidelines) */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[styles.googleButton, dynamicStyles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={!!loadingProvider}
              activeOpacity={0.85}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator size="small" color="#FFC70A" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                    style={styles.googleIcon}
                    defaultSource={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  />
                  <Text style={[styles.googleButtonText, dynamicStyles.googleText]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]} />
            <Text style={[styles.dividerText, dynamicStyles.textSecondary]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]} />
          </View>

          {/* 3. Manual Phone / Email Alternative */}
          {typeof onNavigateToEmail === 'function' && (
            <TouchableOpacity
              style={[styles.phoneButton, { borderColor: isDarkMode ? '#3A3A3C' : '#D1D1D6' }]}
              onPress={onNavigateToEmail}
              disabled={!!loadingProvider}
            >
              <Text style={[styles.phoneButtonText, dynamicStyles.textPrimary]}>
                Use Mobile Number or Email
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Legal Disclaimers */}
        <View style={styles.footer}>
          <Text style={[styles.legalText, dynamicStyles.textSecondary]}>
            By signing in, you agree to Ridingo's{' '}
            <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>

          {typeof onCancel === 'function' && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, dynamicStyles.textSecondary]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20
  },
  header: {
    alignItems: 'center',
    marginTop: 40
  },
  brandIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFC70A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFC70A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6
  },
  brandIconText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#15140F',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black'
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280
  },
  authActions: {
    width: '100%',
    gap: 12
  },
  buttonWrapper: {
    position: 'relative',
    width: '100%',
    height: 52
  },
  appleButton: {
    width: '100%',
    height: 52,
    borderRadius: 14
  },
  customAppleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14
  },
  appleDark: {
    backgroundColor: '#FFFFFF'
  },
  appleLight: {
    backgroundColor: '#000000'
  },
  appleLogoIcon: {
    fontSize: 22,
    marginRight: 8,
    color: 'inherit'
  },
  customAppleText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  buttonLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    resizeMode: 'contain'
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  phoneButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  phoneButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  footer: {
    alignItems: 'center',
    marginTop: 20
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16
  },
  legalLink: {
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  cancelBtn: {
    marginTop: 14,
    padding: 8
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500'
  }
});
