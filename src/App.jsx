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
import PaymentSheet from './components/PaymentSheet';
import DriverApp from './components/DriverApp';

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
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.14)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
            ⚠️
          </div>
          <b style={{ fontSize: '15.5px', color: 'var(--ink)' }}>Display Issue Recovered</b>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 14px', maxWidth: '240px', lineHeight: 1.4 }}>
            {this.props.fallbackMessage || 'The view encountered an unexpected issue.'}
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
    setLiveTrackingOpen
  } = useApp();

  const handleUserPhoneRecovery = () => {
    setBookingOpen(false);
    setLiveTrackingOpen(false);
    setUTab('home');
  };

  React.useEffect(() => {
    const el = document.getElementById('u-content');
    if (el) {
      el.scrollTop = 0;
      window.requestAnimationFrame(() => {
        const el2 = document.getElementById('u-content');
        if (el2) el2.scrollTop = 0;
      });
    }
  }, [uTab, onboardingOpen, user]);

  return (
    <div className="stage full-preview-stage" id="stage" data-view={view}>
        {/* User App Full-Screen Preview */}
        {view === 'user' && (
          <section className="col col-fullscreen" id="col-u" data-theme={userThemeVal} data-theme-setting={userTheme}>
            <div className="phone phone-fullscreen">
              <div className="inner inner-fullscreen">
                <ErrorBoundary
                  fallbackMessage="User app encountered a display issue. Tap below to return home."
                  buttonText="Return to Home"
                  onReset={handleUserPhoneRecovery}
                >
                  <div className="content" id="u-content">
                    <div key={uTab} className="apple-page-enter">
                      {uTab === 'home' && <HomeTab />}
                      {uTab === 'trips' && <TripsTab />}
                      {uTab === 'wallet' && <WalletTab />}
                      {uTab === 'profile' && <ProfileTab />}
                    </div>
                  </div>

                  <BottomNav />

                  <BookingSheet />
                  <NotificationsSheet />
                  <LiveTrackingSheet />
                  <OnboardingModal />
                  <LegalModal />
                  <PaymentSheet />

                  <div className="toasts" id="u-toasts" aria-live="polite">
                    {toasts.map(t => (
                      <div key={t.id} className="toast" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{t.icon === 'check' ? '✓' : 'ℹ'}</span>
                        <span>{t.msg}</span>
                      </div>
                    ))}
                  </div>
                </ErrorBoundary>
              </div>
            </div>
          </section>
        )}

        {/* Driver App Full-Screen Preview */}
        {view === 'driver' && (
          <section className="col col-fullscreen" id="col-d" data-theme={driverThemeVal} data-theme-setting={driverTheme}>
            <div className="phone phone-fullscreen">
              <ErrorBoundary fallbackMessage="Driver app encountered a display issue. Tap to recover.">
                <DriverApp />
              </ErrorBoundary>
            </div>
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
