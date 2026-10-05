import React from 'react';
import { useApp } from '../context/AppContext';

export default function WalletTab() {
  const { utx, setUtx, userBalance, addToast } = useApp();

  const handleTopup = (amt) => {
    const newTx = {
      ts: Date.now(),
      type: 'topup',
      amount: amt,
      title: 'Wallet Top-up',
      sub: 'UPI • Instant'
    };
    setUtx(prev => [newTx, ...prev]);
    addToast(`Added ₹${amt} to your Ridingo Wallet!`, 'check');
  };

  const totalCashback = utx
    .filter(t => t.type === 'cashback')
    .reduce((a, t) => a + t.amount, 0);

  return (
    <div className="tab-pane active" id="tab-wallet">
      <div className="hello" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }}>Wallet</h1>
          <p>Cashback, balance & statements</p>
        </div>
      </div>

      {/* Wallet Card */}
      <div
        className="walletcard"
        style={{
          padding: '22px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1C1C1E 0%, #0A0A0B 100%)',
          color: '#FFFFFF',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ridingo Cash Balance
            </span>
            <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '4px', letterSpacing: '-1px' }}>
              ₹{userBalance.toLocaleString()}
            </div>
          </div>
          <button
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'var(--yellow)',
              color: 'var(--on-yellow)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            onClick={() => handleTopup(1000)}
          >
            + Add Funds
          </button>
        </div>

        <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Lifetime Cashback</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--switch)' }}>₹{totalCashback} Earned</span>
        </div>
      </div>

      {/* Quick Add Chips */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Fast Top-up</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[500, 1000, 2000].map(amt => (
            <button
              key={amt}
              className="chip-btn"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '14px',
                background: 'var(--card)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--ink)'
              }}
              onClick={() => handleTopup(amt)}
            >
              + ₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Transaction History</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {utx.map((tx, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--card)',
                border: '1px solid var(--line)'
              }}
            >
              <div>
                <b style={{ fontSize: '14px', display: 'block' }}>{tx.title}</b>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{tx.sub}</span>
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: tx.amount > 0 ? 'var(--good)' : 'var(--ink)'
                }}
              >
                {tx.amount > 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
