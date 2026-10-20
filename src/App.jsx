import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import HomeTab from './components/HomeTab';
import TripsTab from './components/TripsTab';
import WalletTab from './components/WalletTab';
import ProfileTab from './components/ProfileTab';
import BottomNav from './components/BottomNav';
import BookingSheet from './components/BookingSheet';
import NotificationsSheet from './components/NotificationsSheet';
import LiveTrackingSheet from './components/LiveTrackingSheet';
import OnboardingModal from './components/OnboardingModal';
import LegalModal from './components/LegalModal';
import PhonePePgCheckout from './components/PhonePePgCheckout';
import TripCancellationModal from './components/TripCancellationModal';
import DriverApp from './components/DriverApp';
import AdminPanel from './components/admin/AdminPanel';
import Icon from './components/Icon';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import { checkLocationPermissions, requestLocationPermissions } from './services/nativeLocationService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      if (this.props.onReset) {
        this.props.onReset();
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.14)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Icon name="alert" size={24} color="#EF4444" />
          </div>
          <b style={{ fontSize: '15.5px', color: 'var(--ink)' }}>Display Issue Recovered</b>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 14px', maxWidth: '280px', lineHeight: 1.4 }}>
            {this.state.error?.message || this.props.fallbackMessage || 'The view encountered an unexpected issue.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'var(--solid)',
              color: 'var(--on-solid)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}
          >
            {this.props.buttonText || 'Reload View'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const app = useApp();
  if (!app) return null;
  const {
    view,
    setView,
    uTab,
    setUTab,
    toasts,
    userThemeVal,
    userTheme,
    driverThemeVal,
    driverTheme,
    onboardingOpen,
    user,
    setBookingOpen,
    setLiveTrackingOpen,
    tripToCancel,
    setTripToCancel,
    cancelTripByUser,
    termsConfirmationBanner,
    setTermsConfirmationBanner
  } = useApp();

  const handleUserPhoneRecovery = () => {
    setBookingOpen(false);
    setLiveTrackingOpen(false);
    setUTab('home');
  };

  React.useEffect(() => {
    // Proactively request initial permissions for Device Location & Notifications on initial app launch
    // Strictly routed through Capacitor Geolocation (NEVER triggers WKWebView 'localhost' prompt)
    checkLocationPermissions()
      .then(status => {
        if (status?.location !== 'granted') {
          requestLocationPermissions().catch(() => {});
        }
      })
      .catch(() => {});

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
          console.info('[UserApp] Notification permission:', p);
        });
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    // Graceful fade-out of the App Refresh Splash Screen
    const splash = document.getElementById('app-splash-screen');
    if (splash) {
      const timer = setTimeout(() => {
        splash.classList.add('splash-fade-out');
        setTimeout(() => {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 500);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    const el = document.getElementById('u-content');
    if (el) {
      el.scrollTop = 0;
      window.requestAnimationFrame(() => {
        const el2 = document.getElementById('u-content');
        if (el2) el2.scrollTop = 0;
      });
    }
  }, [uTab]);

  return (
    <div className="stage full-preview-stage" id="stage" data-view={view}>
        {/* User App Full-Screen Preview */}
        {view === 'user' && (
          <section className="col col-fullscreen" id="col-u" data-theme={userThemeVal} data-theme-setting={userTheme}>
            <div className="phone phone-fullscreen">
              <div className="inner inner-fullscreen">
                <NetworkStatusBanner />
                <ErrorBoundary
                  fallbackMessage="User app encountered a display issue. Tap below to return home."
                  buttonText="Return to Home"
                  onReset={handleUserPhoneRecovery}
                >
                  <div className="content" id="u-content" style={{ display: onboardingOpen ? 'none' : 'block' }}>
                    <div key={uTab} className="apple-page-enter">
                      {(uTab === 'home' || !['trips', 'history', 'wallet', 'profile'].includes(uTab)) && <HomeTab />}
                      {(uTab === 'trips' || uTab === 'history') && <TripsTab />}
                      {uTab === 'wallet' && <WalletTab />}
                      {uTab === 'profile' && <ProfileTab />}
                    </div>
                  </div>

                  {!onboardingOpen && <BottomNav />}

                  <BookingSheet />
                  <NotificationsSheet />
                  <LiveTrackingSheet />
                  <OnboardingModal />
                  <LegalModal />
                  <PhonePePgCheckout />
                  {tripToCancel && (
                    <TripCancellationModal
                      trip={tripToCancel}
                      onConfirm={(tripId) => {
                        cancelTripByUser(tripId);
                        setTripToCancel(null);
                      }}
                      onClose={() => setTripToCancel(null)}
                    />
                  )}

                  <div className="toasts" id="u-toasts" aria-live="polite">
                    {toasts.map(t => (
                      <div key={t.id} className="toast" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name={t.icon === 'check' ? 'check' : 'info'} size={14} />
                        <span>{t.msg}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confirmation Banner at Bottom Confirming Acceptance of Terms */}
                  {termsConfirmationBanner && (
                    <div
                      className="terms-accepted-bottom-banner"
                      style={{
                        position: 'fixed',
                        bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
                        left: '16px',
                        right: '16px',
                        maxWidth: '430px',
                        margin: '0 auto',
                        zIndex: 100060,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#16A34A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Icon name="check" size={15} color="#FFFFFF" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ fontSize: '13px', display: 'block', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                            Terms Confirmed & Accepted
                          </b>
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', display: 'block', lineHeight: 1.25 }}>
                            {termsConfirmationBanner.text || 'Waiting charges policy reviewed and confirmed for this trip.'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTermsConfirmationBanner(null)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          border: 'none',
                          color: '#FFFFFF',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        aria-label="Dismiss confirmation banner"
                      >
                        <Icon name="x" size={13} color="#FFFFFF" />
                      </button>
                    </div>
                  )}
                </ErrorBoundary>
              </div>
            </div>
          </section>
        )}

        {/* Driver App Full-Screen Preview */}
        {view === 'driver' && (
          <section className="col col-fullscreen" id="col-d" data-theme={driverThemeVal} data-theme-setting={driverTheme}>
            <div className="phone phone-fullscreen">
              <div className="inner inner-fullscreen" style={{ display: 'flex', flexDirection: 'column' }}>
                <NetworkStatusBanner />
                <ErrorBoundary fallbackMessage="Driver app encountered a display issue. Tap to recover.">
                  <DriverApp />
                </ErrorBoundary>
              </div>
            </div>
          </section>
        )}

        {/* CRM Admin Panel Full View */}
        {view === 'admin' && (
          <section style={{ width: '100%', minHeight: '100vh', display: 'flex', background: '#0A0B0E' }}>
            <ErrorBoundary fallbackMessage="Admin panel encountered a display issue.">
              <AdminPanel />
            </ErrorBoundary>
          </section>
        )}
      </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
