import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openRazorpayCheckout } from '../utils/razorpay';

export default function WalletTab() {
  const { utx, setUtx, userBalance, user, addToast } = useApp();
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmt, setAddAmt] = useState('1000');

  const totalCashback = utx
    .filter(t => t.type === 'cashback')
    .reduce((a, t) => a + t.amount, 0);

  const handleAdd = (amt) => {
    const val = parseInt(amt, 10);
    if (!val || val <= 0) return;

    openRazorpayCheckout({
      amount: val,
      name: 'Ridingo Wallet Top Up',
      description: `Add ₹${val} to Ridingo balance`,
      prefill: {
        name: user?.name || 'Customer',
        email: user?.email || 'customer@ridingo.in',
        phone: user?.phone || '+919840123456'
      },
      notes: {
        purpose: 'wallet_topup'
      },
      onSuccess: (paymentRes) => {
        const pId = paymentRes.razorpay_payment_id || ('pay_test_' + Date.now().toString(36));
        const newTx = {
          ts: Date.now(),
          type: 'topup',
          amount: val,
          title: 'Razorpay Wallet Top Up',
          sub: `Payment ID: ${pId.slice(0, 14)} · Just now`,
          gateway: 'Razorpay',
          paymentId: pId
        };
        setUtx(prev => [newTx, ...prev]);
        setShowAddMoney(false);
        addToast(`₹${val.toLocaleString('en-IN')} added via Razorpay!`, 'check');
      },
      onError: (err) => {
        addToast('Top-up payment cancelled or failed', 'warn');
      }
    });
  };

  return (
    <div>
      <div className="hello stagger-1" style={{ marginBottom: '14px' }}>
        <h1>Wallet</h1>
        <p>Advance payments and rewards</p>
      </div>

      {/* Exact Wallet Card from Original CSS */}
      <div className="walletcard stagger-2">
        <div className="walletcard-head">
          <span className="walletcard-brand">Ridingo</span>
          <span className="walletcard-pill">Digital Wallet</span>
        </div>
        <div className="walletcard-lab">Current Balance</div>
        <div className="walletcard-bal">₹{(Number(userBalance) || 0).toLocaleString('en-IN')}</div>
        <div className="walletcard-foot">
          <button className="walletcard-add-btn" onClick={() => setShowAddMoney(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add Fund</span>
          </button>
          <span className="walletcard-cb">
            <Icon name="gift" size={15} /> ₹{totalCashback} cashback
          </span>
        </div>
      </div>

      {/* Add Money Modal / Quick Add Panel */}
      {showAddMoney && (
        <div className="card stagger-3" style={{ padding: '16px', marginBottom: '18px', background: 'var(--field)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <b style={{ fontSize: '14px' }}>Top-up Wallet (Razorpay Gateway)</b>
            <button onClick={() => setShowAddMoney(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
          <div className="chips" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[500, 1000, 2000, 5000].map(v => (
              <button
                key={v}
                className={`chip ${addAmt === String(v) ? 'on' : ''}`}
                onClick={() => setAddAmt(String(v))}
              >
                ₹{v}
              </button>
            ))}
          </div>
          <button
            className="btn primary block"
            onClick={() => handleAdd(addAmt)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Pay ₹{addAmt} via Razorpay</span>
            <span style={{ fontSize: '11px', background: 'rgba(0, 0, 0, 0.15)', padding: '2px 7px', borderRadius: '6px', fontWeight: 750 }}>
              Test Mode
            </span>
          </button>
        </div>
      )}

      {/* Transaction Section Header */}
      <div className="sec stagger-3" style={{ margin: '22px 0 10px' }}>
        <h3>Transaction</h3>
        <span className="sub" style={{ fontWeight: 600, color: 'var(--muted)' }}>
          View All
        </span>
      </div>

      {/* Exact Transaction Rows matching txRows() in index.html */}
      <div className="tx-list stagger-4">
        {utx.map((t, idx) => {
          const letter = (t.title?.charAt(0) || 'W').toUpperCase();
          const isPos = t.amount > 0;
          return (
            <div key={idx} className="tx">
              <span className="tx-badge">{letter}</span>
              <div className="tx-main">
                <b className="tx-title ell">{t.title}</b>
                <span className="tx-sub ell">{t.sub}</span>
              </div>
              <span className={`tx-amt ${isPos ? 'pos' : ''}`}>
                {isPos ? '+' : ''}₹{Math.abs(t.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
