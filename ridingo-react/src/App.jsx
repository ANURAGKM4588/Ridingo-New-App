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
import OnboardingModal from './components/OnboardingModal';
import DriverApp from './components/DriverApp';

function MainApp() {
  const { view, uTab, toasts } = useApp();

  return (
    <>
      <Header />
      <div className="checker" aria-hidden="true" />
      <p className="hint">
        Book a trip in the user app. The request pops up in the driver app. Accept it there and the user app gets a notification. Both apps share the same live data.
      </p>

      <div className="stage" id="stage" data-view={view}>
        {/* User App Phone */}
        <section className="col" id="col-u">
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

              <div className="content" id="u-content">
                {uTab === 'home' && <HomeTab />}
                {uTab === 'trips' && <TripsTab />}
                {uTab === 'wallet' && <WalletTab />}
                {uTab === 'profile' && <ProfileTab />}
              </div>

              <BottomNav />
              <BookingSheet />
              <NotificationsSheet />
              <OnboardingModal />

              <div className="toasts" id="u-toasts" aria-live="polite">
                {toasts.map(t => (
                  <div key={t.id} className="toast" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{t.icon === 'check' ? '✓' : 'ℹ'}</span>
                    <span>{t.msg}</span>
                  </div>
                ))}
              </div>

              <div className="homebar" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Driver App Phone */}
        <section className="col" id="col-d">
          <h2 className="col-h">
            Driver app <small>Accept and drive</small>
          </h2>
          <div className="phone">
            <DriverApp />
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
