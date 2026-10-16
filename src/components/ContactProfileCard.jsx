import React from 'react';
import Icon from './Icon';

/**
 * ContactProfileCard: Clean, consistent profile card with functional Call and WhatsApp actions
 * Used across both User App and Driver App
 */
export default function ContactProfileCard({
  name = 'Arjun Menon',
  role = 'Customer',
  phone = '+91 98401 23456',
  rating = '4.9',
  avatar = null,
  badge = null,
  showActions = true,
  style = {}
}) {
  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  const waNumber = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

  const handleCallClick = (e) => {
    e.stopPropagation();
    if (cleanPhone) {
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleWhatsAppClick = (e) => {
    e.stopPropagation();
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=Hi%20${encodeURIComponent(name)},%20connecting%20via%20Ridingo`, '_blank');
    }
  };

  const initials = (name || 'Member')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <div
      className="contact-profile-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderRadius: '16px',
        background: 'var(--field, #F8FAFC)',
        border: '1px solid var(--line, #E2E8F0)',
        boxSizing: 'border-box',
        width: '100%',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#000000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '0.04em',
              flexShrink: 0
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <b style={{ fontSize: '13.5px', color: 'var(--ink, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </b>
            {rating && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(255, 199, 10, 0.22)',
                  color: 'var(--on-yellow-soft, #B45309)',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1.5px 5px',
                  borderRadius: '5px'
                }}
              >
                ★ {rating}
              </span>
            )}
            {badge && (
              <span
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#16A34A',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1.5px 5px',
                  borderRadius: '5px'
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted, #64748B)', marginTop: '1px' }}>
            {role} · {cleanPhone || '+91 94471 23456'}
          </span>
        </div>
      </div>

      {/* Action Buttons: Round Outline Call & Round Green WhatsApp */}
      {showActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Round Outline Call Button with Call Icon only */}
          <button
            type="button"
            onClick={handleCallClick}
            title={`Call ${name}`}
            aria-label={`Call ${name}`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'transparent',
              color: 'var(--ink, #0F172A)',
              border: '1.5px solid var(--ink, #0F172A)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxSizing: 'border-box',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="phone" size={16} />
          </button>

          {/* Round WhatsApp Green Button with White WhatsApp Icon only */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            title={`WhatsApp ${name}`}
            aria-label={`WhatsApp ${name}`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxSizing: 'border-box',
              boxShadow: '0 3px 10px rgba(37, 211, 102, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="whatsapp" size={19} color="#FFFFFF" />
          </button>
        </div>
      )}
    </div>
  );
}
