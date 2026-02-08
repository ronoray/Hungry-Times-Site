// src/pages/Offers.jsx
import React, { useState } from 'react';
import './Offers.css';
import API_BASE from '../config/api';
import SEOHead from '../components/SEOHead';

export default function Offers() {
  const [customerPhone, setCustomerPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState({ show: false, type: '', message: '' });
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    const code = verifyCode.trim().toUpperCase();
    const phone = customerPhone.trim();
    
    if (!code) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter a referral code' });
      return;
    }

    if (!phone) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter your phone number' });
      return;
    }

    // Basic phone validation (10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter a valid 10-digit phone number' });
      return;
    }

    setVerifying(true);
    setVerifyResult({ show: false, type: '', message: '' });

    try {
      // If your endpoint is public under /api/public, change to `${API_BASE}/api/public/referral/validate`
      const response = await fetch(`${API_BASE}/referral/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          customerPhone: phone
        })
      });

      // prevent JSON parse crash on 4xx/5xx
      let data = null;
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json().catch(() => null);
      }

      if (response.ok && data) {
        if (data.valid) {
          // CODE IS VALID AND CAN BE USED
          let statusClass = 'success';
          let displayMessage = '';

          // Different scenarios based on state
          switch (data.state) {
            case 'CODE_READY_FOR_OWNER':
              displayMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #10b981;">✅ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                  <p style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; font-weight: 500;">
                    💰 <strong>${data.discount_percent}% OFF</strong> on your order!
                  </p>
                  <p style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">${data.action}</p>
                </div>
              `;
              break;

            case 'CODE_READY_FOR_NEW_CUSTOMER':
              displayMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #10b981;">✅ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                  <p style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; font-weight: 500;">
                    💰 <strong>${data.discount_percent}% OFF</strong> on your first order!
                  </p>
                  <p style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">${data.action}</p>
                </div>
              `;
              break;

            default:
              displayMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #10b981;">✅ ${data.title}</p>
                  <p>${data.message}</p>
                  ${data.details ? `<p style="margin-top: 10px; opacity: 0.9;">${data.details}</p>` : ''}
                  ${data.discount_percent ? `<p style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; font-weight: 500;">💰 <strong>${data.discount_percent}% OFF</strong></p>` : ''}
                </div>
              `;
          }

          setVerifyResult({
            show: true,
            type: statusClass,
            message: displayMessage
          });
        } else {
          // CODE IS NOT VALID
          let errorClass = 'error';
          let errorMessage = '';

          switch (data.state) {
            case 'CODE_PENDING_ACTIVATION':
              errorClass = 'info';
              errorMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #f59e0b;">⏳ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                  <p style="margin-top: 10px; padding: 10px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; font-size: 0.9em;">
                    ${data.action}
                  </p>
                </div>
              `;
              break;

            case 'CODE_EXPIRED':
              errorMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #ef4444;">⏰ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                  <p style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">${data.action}</p>
                </div>
              `;
              break;

            case 'CODE_ALREADY_USED':
              errorMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #6b7280;">✓ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                </div>
              `;
              break;

            case 'CODE_NOT_FOUND':
              errorMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #ef4444;">❌ ${data.title}</p>
                  <p>${data.message}</p>
                  <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">${data.details}</p>
                  <p style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">${data.action}</p>
                </div>
              `;
              break;

            default:
              errorMessage = `
                <div style="text-align: center;">
                  <div class="code-display">${code}</div>
                  <p style="font-weight: bold; color: #ef4444;">❌ ${data.title || 'Code Not Valid'}</p>
                  <p>${data.message || 'This code cannot be used.'}</p>
                  ${data.details ? `<p style="margin-top: 10px; opacity: 0.9;">${data.details}</p>` : ''}
                </div>
              `;
          }

          setVerifyResult({
            show: true,
            type: errorClass,
            message: errorMessage
          });
        }
      } else {
        setVerifyResult({
          show: true,
          type: 'error',
          message: (data && (data.message || data.error)) || 'Failed to verify code.',
        });
      }
    } catch (error) {
      console.error('Verify error:', error);
      setVerifyResult({ 
        show: true, 
        type: 'error', 
        message: 'Unable to connect to server. Please check your connection and try again.' 
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="offers-container">
      <SEOHead
        title="Offers & Referrals"
        description="Check out the latest offers at Hungry Times. Use referral codes and get discounts on your online food orders in Kolkata."
        canonicalPath="/offers"
      />
      {/* Header */}
      <div className="offers-header">
        <a href="/" className="back-link">← Back to Home</a>
        <h1>🎉 Referral Program</h1>
        <p className="subtitle">Share & Earn 15% OFF Together!</p>
      </div>

      {/* Offer Description */}
      <div className="offer-highlight">
        <h3>How Our Referral Program Works</h3>
        <p>Our referral program is designed to reward both you and your friends! Here's how it works:</p>
        <ul>
          <li><strong>Get Your Code:</strong> Receive a unique referral code from Hungry Times</li>
          <li><strong>Share with Friends:</strong> Give your code to someone who hasn't ordered from us before</li>
          <li><strong>They Save 15%:</strong> Your friend gets 15% OFF on their first order using your code</li>
          <li><strong>You Save 15%:</strong> After they use your code, it activates for YOU to get 15% OFF too!</li>
          <li><strong>90-Day Validity:</strong> Codes are valid for 90 days from generation</li>
          <li><strong>One-Time Use:</strong> Each code can be used twice total (once by friend, once by you)</li>
        </ul>
      </div>

      {/* Verify Code Section */}
      <div className="section">
        <h2 className="section-title">Verify Your Referral Code</h2>
        <p className="section-description">
          Have a referral code? Enter your phone number and the code below to check if it's valid and ready to use!
        </p>

        <form onSubmit={handleVerify}>
          <div className="input-group">
            <label htmlFor="customerPhone">Your Phone Number</label>
            <input
              type="tel"
              id="customerPhone"
              placeholder="Enter your 10-digit phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>

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
        <h2 className="section-title">Step-by-Step Guide</h2>
        <div className="how-it-works">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Receive Your Code</h4>
              <p>Get a unique referral code from Hungry Times when you're selected for the program</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Share with New Customer</h4>
              <p>Give your code to a friend who hasn't ordered from us before</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Friend Gets 15% OFF</h4>
              <p>Your friend uses the code on their first order and receives 15% discount</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Your Code Activates</h4>
              <p>Once your friend uses the code, it becomes active for you to redeem</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h4>You Get 15% OFF</h4>
              <p>Use your now-active code on your next order and enjoy 15% discount!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Code States Explained */}
      <div className="section">
        <h2 className="section-title">Understanding Code Status</h2>
        <div className="status-guide">
          <div className="status-item">
            <span className="status-badge pending">Pending</span>
            <p>Code is waiting to be used by a new customer first. Share it with a friend!</p>
          </div>
          <div className="status-item">
            <span className="status-badge active">Active</span>
            <p>Code has been activated by a new customer. The owner can now use it for their discount!</p>
          </div>
          <div className="status-item">
            <span className="status-badge used">Used</span>
            <p>Code has completed its lifecycle. Both the friend and owner have received their discounts.</p>
          </div>
          <div className="status-item">
            <span className="status-badge expired">Expired</span>
            <p>Code validity period (90 days) has ended. Request a new code to participate again.</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h4>Can I use my own code immediately?</h4>
            <p>No, your code must first be used by a NEW customer (someone who hasn't ordered from us before). After they use it and get 15% off, your code becomes active for you to use.</p>
          </div>
          <div className="faq-item">
            <h4>What happens when someone uses my code?</h4>
            <p>When a new customer uses your code, they get 15% OFF on their order, and your code status changes from "Pending" to "Active". You can then use it for your own 15% discount!</p>
          </div>
          <div className="faq-item">
            <h4>Can I share my code with multiple people?</h4>
            <p>You can share your code with as many people as you want, but only the FIRST new customer who uses it will activate it. After that, you can redeem your discount.</p>
          </div>
          <div className="faq-item">
            <h4>How long is my code valid?</h4>
            <p>Referral codes are valid for 90 days from the date they are generated. Make sure to share and use them within this timeframe!</p>
          </div>
          <div className="faq-item">
            <h4>Can I get multiple codes?</h4>
            <p>Codes are issued by Hungry Times to selected customers. Contact us to inquire about receiving additional referral codes.</p>
          </div>
        </div>
      </div>

      {/* Loyalty Programs Section */}
      <div className="section loyalty-section-container">
        <h2 className="section-title">More Rewards Coming Soon</h2>
        <div className="loyalty-section">
          <div className="loyalty-icon">🎁</div>
          <h3>Loyalty Program in Development</h3>
          <p className="section-description">
            We're working on additional loyalty rewards and exclusive benefits for our valued customers. Stay tuned for points, special perks, and more ways to save!
          </p>
          <div className="loading-text">Coming Soon...</div>
        </div>
      </div>
    </div>
  );
}