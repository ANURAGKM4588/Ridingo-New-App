import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
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
    <>
      <Header />
      <div className="checker" aria-hidden="true" />
      <p className="hint">
        Book a trip in the user app. The request pops up in the driver app. Accept it there and the user app gets a notification. Both apps share the same live data.
      </p>

      <div className="stage" id="stage" data-view={view}>
        {/* User App Phone */}
        <section className="col" id="col-u" data-theme={userThemeVal} data-theme-setting={userTheme}>
          <h2 className="col-h">
            User app <small>Book a driver</small>
          </h2>
          <div className="phone">
            <div className="inner">
              <div className="island" aria-hidden="true" />
              <div className="statusbar">
                <span className="clock">9:41</span>
                <span className="sb-r" aria-hidden="true">
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="1" />
                    <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                    <rect x="10" y="3" width="3" height="9" rx="1" />
                    <rect x="15" y="0" width="3" height="12" rx="1" />
                  </svg>
                  <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1.5 4.3a10 10 0 0 1 14 0" />
                    <path d="M4 7a6.4 6.4 0 0 1 9 0" />
                    <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
                    <rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".45" />
                    <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
                    <path d="M24.5 4.5v4c.9-.3 1.5-1.1 1.5-2s-.6-1.7-1.5-2z" fill="currentColor" opacity=".5" />
                  </svg>
                </span>
              </div>

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

              <div className="homebar" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Driver App Phone */}
        <section className="col" id="col-d" data-theme={driverThemeVal} data-theme-setting={driverTheme}>
          <h2 className="col-h">
            Driver app <small>Accept and drive</small>
          </h2>
          <div className="phone">
            <ErrorBoundary fallbackMessage="Driver app encountered a display issue. Tap to recover.">
              <DriverApp />
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
