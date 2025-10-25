// src/pages/Offers.jsx
import React, { useState } from 'react';
import './Offers.css';

const API_BASE = 'https://ops.hungrytimes.in/api';

export default function Offers() {
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState({ show: false, type: '', message: '' });
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    const code = verifyCode.trim().toUpperCase();
    
    if (!code) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter a code' });
      return;
    }

    setVerifying(true);
    setVerifyResult({ show: false, type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE}/referral/verify?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (response.ok) {
        if (data.valid) {
          let statusMessage = '';
          let statusClass = 'success';

          if (data.status === 'active') {
            statusMessage = '✅ This code is valid and ready to use! Enjoy 15% OFF on your order.';
          } else if (data.status === 'pending') {
            statusMessage = '⏳ This code is pending activation.';
            statusClass = 'info';
          } else if (data.status === 'used') {
            statusMessage = '✓ This code has already been used.';
            statusClass = 'info';
          }

          setVerifyResult({
            show: true,
            type: statusClass,
            message: `
              <div style="text-align: center;">
                <div class="code-display">${code}</div>
                <p>${statusMessage}</p>
                ${data.message ? `<p style="margin-top: 10px; opacity: 0.9;">${data.message}</p>` : ''}
              </div>
            `
          });
        } else {
          let errorMessage = '❌ This code is not valid.';
          
          if (data.status === 'expired') {
            errorMessage = '⏰ This code has expired.';
          } else if (data.message) {
            errorMessage = data.message;
          }

          setVerifyResult({
            show: true,
            type: 'error',
            message: `<div style="text-align: center;"><p>${errorMessage}</p></div>`
          });
        }
      } else {
        setVerifyResult({ 
          show: true, 
          type: 'error', 
          message: data.error || data.message || 'Failed to verify code.' 
        });
      }
    } catch (error) {
      console.error('Verify error:', error);
      setVerifyResult({ 
        show: true, 
        type: 'error', 
        message: 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="offers-container">
      {/* Header */}
      <div className="offers-header">
        <a href="/" className="back-link">← Back to Home</a>
        <h1>🎉 Special Offers</h1>
        <p className="subtitle">Get 15% OFF on your orders</p>
      </div>

      {/* Offer Description */}
      <div className="offer-highlight">
        <h3>15% Discount Offer</h3>
        <p>We're running an exclusive referral program! If you have a referral code, verify it below to enjoy amazing savings:</p>
        <ul>
          <li>Enter your unique referral code</li>
          <li>Get 15% OFF on your order</li>
          <li>Valid codes are active for 30 days</li>
          <li>One-time use per code</li>
        </ul>
      </div>

      {/* Verify Code Section */}
      <div className="section">
        <h2 className="section-title">Verify Your Referral Code</h2>
        <p className="section-description">
          Have a referral code? Enter it below to check if it's valid and ready to use for your discount!
        </p>

        <form onSubmit={handleVerify}>
          <div className="input-group">
            <label htmlFor="verifyCode">Referral Code</label>
            <input
              type="text"
              id="verifyCode"
              placeholder="Enter code (e.g., HT-XXXXX)"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? <><span className="loading"></span> Verifying...</> : 'Verify Code'}
          </button>
        </form>

        {verifyResult.show && (
          <div className={`result-box ${verifyResult.type}`} dangerouslySetInnerHTML={{ __html: verifyResult.message }} />
        )}
      </div>

      {/* How It Works Section */}
      <div className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="how-it-works">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Get Your Code</h4>
              <p>Receive a unique referral code from Hungry Times</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Verify Code</h4>
              <p>Use the form above to verify your code is valid</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Place Order</h4>
              <p>Apply your code at checkout and enjoy 15% OFF!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Programs Section */}
      <div className="section loyalty-section-container">
        <h2 className="section-title">Loyalty Program</h2>
        <div className="loyalty-section">
          <div className="loyalty-icon">🎁</div>
          <h3>Coming Soon!</h3>
          <p className="section-description">
            Exciting loyalty rewards are on their way! Stay tuned for exclusive benefits, points, and special perks for our valued customers.
          </p>
          <div className="loading-text">Loyalty Program Loading...</div>
        </div>
      </div>
    </div>
  );
}