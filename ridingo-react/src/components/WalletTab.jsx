import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function WalletTab() {
  const { utx, setUtx, userBalance, addToast } = useApp();
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmt, setAddAmt] = useState('1000');

  const totalCashback = utx
    .filter(t => t.type === 'cashback')
    .reduce((a, t) => a + t.amount, 0);

  const handleAdd = (amt) => {
    const val = parseInt(amt, 10);
    if (!val || val <= 0) return;
    const newTx = {
      ts: Date.now(),
      type: 'topup',
      amount: val,
      title: 'UPI Top Up',
      sub: 'Deposit · ' + new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    };
    setUtx(prev => [newTx, ...prev]);
    setShowAddMoney(false);
    addToast(`Added ₹${val} to your Ridingo Wallet!`, 'check');
  };

  return (
    <div>
      <div className="hello" style={{ marginBottom: '14px' }}>
        <h1>Wallet</h1>
        <p>Advance payments and rewards</p>
      </div>

      {/* Exact Wallet Card from Original CSS */}
      <div className="walletcard">
        <div className="walletcard-head">
          <span className="walletcard-brand">Ridingo</span>
          <span className="walletcard-pill">Digital Wallet</span>
        </div>
        <div className="walletcard-lab">Current Balance</div>
        <div className="walletcard-bal">₹{userBalance.toLocaleString('en-IN')}</div>
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
        <div className="card" style={{ padding: '16px', marginBottom: '18px', background: 'var(--field)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <b style={{ fontSize: '14px' }}>Top-up Wallet (Instant UPI)</b>
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
            style={{ width: '100%' }}
          >
            Add ₹{addAmt}
          </button>
        </div>
      )}

      {/* Transaction Section Header */}
      <div className="sec" style={{ margin: '22px 0 10px' }}>
        <h3>Transaction</h3>
        <span className="sub" style={{ fontWeight: 600, color: 'var(--muted)' }}>
          View All
        </span>
      </div>

      {/* Exact Transaction Rows matching txRows() in index.html */}
      <div className="tx-list">
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
