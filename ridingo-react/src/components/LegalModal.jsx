import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function LegalModal() {
  const { legalModal, setLegalModal } = useApp();

  if (!legalModal?.open) return null;

  const activeTab = legalModal.tab || 'terms';
  const setActiveTab = (tab) => setLegalModal(prev => ({ ...prev, tab }));
  const handleClose = () => setLegalModal(prev => ({ ...prev, open: false }));

  return (
    <div
      className="layer on"
      id="u-legal-layer"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0, 0, 0, 0.48)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fade 0.2s ease',
        borderRadius: '48px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{ position: 'absolute', inset: 0 }}
        onClick={handleClose}
      />

      <div
        className="sheet apple-page-enter"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          background: 'var(--surface)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          height: '92%',
          maxHeight: '92%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2,
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.22)',
          overflow: 'hidden'
        }}
      >
        {/* Sticky Header with iOS Segmented Switcher */}
        <div
          style={{
            padding: '12px 18px 14px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--card)',
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '999px',
              background: 'var(--line-strong)',
              margin: '0 auto 12px'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 500 }}>
                Effective October 2026 · Ridingo India
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="iconbtn"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--field)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Close legal sheet"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* iOS-Style Minimal Segmented Pill Control */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--field)',
              padding: '3px',
              borderRadius: '12px',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              style={{
                height: '34px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'terms' ? 'var(--card)' : 'transparent',
                color: activeTab === 'terms' ? 'var(--ink)' : 'var(--muted)',
                boxShadow: activeTab === 'terms' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              Terms of Service
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              style={{
                height: '34px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'privacy' ? 'var(--card)' : 'transparent',
                color: activeTab === 'privacy' ? 'var(--ink)' : 'var(--muted)',
                boxShadow: activeTab === 'privacy' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with Mobile App Design */}
        <div
          className="sheet-scroll-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 18px 24px',
            scrollbarWidth: 'none'
          }}
        >
          {activeTab === 'terms' ? (
            /* ==========================================================
               TERMS OF SERVICE (Modern Mobile App Layout)
               ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(255, 199, 10, 0.12)',
                  border: '1px solid rgba(255, 199, 10, 0.35)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>🛡️</span>
                <span style={{ fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500 }}>
                  <b>Ridingo is a driver-providing service platform.</b> You provide the vehicle; we provide verified, professional chauffeurs on demand.
                </span>
              </div>

              {[
                {
                  num: '01',
                  title: 'Platform Nature & Agency Scope',
                  body: 'Ridingo connects car owners and authorized users with independent, verified chauffeurs. Ridingo does not own or provide vehicles; our service consists solely of matching and dispatching qualified drivers to drive your personal or commercial vehicle.'
                },
                {
                  num: '02',
                  title: 'Vehicle Roadworthiness & Compliance',
                  body: 'You warrant that your vehicle is legally registered, holds a valid certificate of insurance (comprehensive or third-party), active Pollution Under Control (PUC) certificate, and is mechanically safe to operate with sufficient fuel for the booked journey.'
                },
                {
                  num: '03',
                  title: 'Transparent Pricing & Advance Payment',
                  body: 'Fares are calculated based on hourly duration, daily packages, or flat airport rates. A booking advance of approximately 30% is processed upon reservation. The remaining balance is payable upon trip completion via UPI, wallet, or card.'
                },
                {
                  num: '04',
                  title: 'Professional Chauffeur Standards',
                  body: 'All Ridingo driver partners undergo background screening, license verification, and defensive driving assessments. Chauffeurs are required to observe all traffic regulations, maintain passenger privacy, and ensure vehicle safety at all times.'
                },
                {
                  num: '05',
                  title: 'Zero Tolerance Policy',
                  body: 'We enforce strict zero tolerance for operating vehicles under the influence of alcohol, drugs, or illegal substances. Both riders and chauffeurs are entitled to a safe, harassment-free environment with instant SOS emergency dispatch support.'
                },
                {
                  num: '06',
                  title: 'Cancellation & Rescheduling',
                  body: 'Bookings may be cancelled free of charge up to 30 minutes before the scheduled pickup time. Cancellations made after a chauffeur is dispatched may incur a nominal cancellation fee credited towards partner dispatch compensation.'
                },
                {
                  num: '07',
                  title: 'Insurance & Damage Claims',
                  body: 'Primary vehicle insurance covers the vehicle and third-party liabilities during the trip. In the rare event of traffic incidents, Ridingo facilitates full incident documentation, partner accountability, and concierge support.'
                },
                {
                  num: '08',
                  title: 'Governing Law & Jurisdiction',
                  body: 'These Terms are governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the competent courts in Kochi / Ernakulam, Kerala.'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                    background: 'var(--card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--on-yellow)',
                        background: 'var(--yellow)',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}
                    >
                      {item.num}
                    </span>
                    <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{item.title}</b>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* ==========================================================
               PRIVACY POLICY (Modern Mobile App Layout)
               ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>🔒</span>
                <span style={{ fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500 }}>
                  <b>Your privacy is safeguarded.</b> We strictly use end-to-end phone number masking and do not sell your personal or location data to advertising brokers.
                </span>
              </div>

              {[
                {
                  num: '01',
                  title: 'Information We Collect',
                  body: 'We collect your mobile number, name, and email address for account authentication. We also save registered vehicle details (model, registration plate) to verify vehicle suitability for chauffeurs.'
                },
                {
                  num: '02',
                  title: 'Precise Location & Real-Time GPS',
                  body: 'Location coordinates are collected only while using the application to determine pickup spots, calculate route navigation, estimate ETA, and provide live trip tracking to your trusted emergency contacts.'
                },
                {
                  num: '03',
                  title: 'Phone Number Masking & Security',
                  body: 'Calls and communications between car owners and chauffeurs are routed through encrypted number masking gateways. Your personal private phone number is never exposed to drivers.'
                },
                {
                  num: '04',
                  title: 'How We Use Your Data',
                  body: 'Data is strictly utilized for core service functionality: driver dispatching, route optimization, digital wallet transactions, emergency SOS alerts, and customer grievance redressal.'
                },
                {
                  num: '05',
                  title: 'Strict No-Sale Policy',
                  body: 'Ridingo does not sell, rent, monetize, or trade your personal information or movement history to third-party advertising networks or external data aggregators.'
                },
                {
                  num: '06',
                  title: 'Data Retention & Account Deletion',
                  body: 'You may export your trip records or request complete account and data deletion at any time directly through the Privacy & Data Controls section in the Profile tab.'
                },
                {
                  num: '07',
                  title: 'Grievance Officer & Contact Desk',
                  body: 'For privacy inquiries, grievance redressal, or data assistance, contact our dedicated compliance desk at teme.ridingo@gmail.com or call +91 8156938843.'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                    background: 'var(--card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#16A34A',
                        background: 'rgba(34, 197, 94, 0.15)',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}
                    >
                      {item.num}
                    </span>
                    <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{item.title}</b>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Official Contact Pill Card */}
          <div
            className="card"
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'var(--field)',
              border: '1px solid var(--line)',
              marginTop: '14px',
              textAlign: 'center'
            }}
          >
            <b style={{ fontSize: '12.5px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
              Ridingo Mobility Technologies
            </b>
            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
              Kochi, Kerala, India · PIN 682024
            </span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
              <a href="mailto:teme.ridingo@gmail.com" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
                teme.ridingo@gmail.com
              </a>
              <span style={{ color: 'var(--line-strong)' }}>•</span>
              <a href="tel:+918156938843" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
                +91 8156938843
              </a>
            </div>
          </div>

          {/* Bottom Dismiss Button */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '14px',
              background: 'var(--solid)',
              color: 'var(--on-solid)',
              border: 'none',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '16px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
            }}
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
}
