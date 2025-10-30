// src/pages/UnderConstruction.jsx
import React from 'react';
import './UnderConstruction.css';

export default function UnderConstruction() {
  const isDev = import.meta.env.DEV;
  const link = (path) => (isDev ? `https://ops.hungrytimes.in${path}` : path);

  const hardNav = (e) => {
    if (!isDev) {
      e.preventDefault();
      window.location.assign(e.currentTarget.href);
    }
  };

  return (
    <>
      <div className="uc-container">
        <div className="uc-content">
          {/* Logo/Icon */}
          <div className="uc-icon">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="rgba(212, 175, 55, 0.1)" stroke="#d4af37" strokeWidth="2"/>
              <path d="M30 45 L40 35 L40 55 Z" fill="#d4af37"/>
              <path d="M70 45 L60 35 L60 55 Z" fill="#d4af37"/>
              <circle cx="50" cy="50" r="20" stroke="#d4af37" strokeWidth="2" fill="none"/>
            </svg>
          </div>

          {/* Heading */}
          <h1>Hungry Times</h1>
          <h2>We're Cooking Up Something Special!</h2>
          
          {/* Description */}
          <p className="description">
            Our website is currently under construction. We're working hard to bring you an amazing experience. 
            In the meantime, check out what we have available!
          </p>

          {/* Action Buttons Grid */}
          <div className="uc-actions-grid">
            <a href="/menu" className="action-card">
              <span className="action-icon">🍽️</span>
              <span className="action-text">Menu</span>
            </a>
            <a href="/offers" className="action-card">
              <span className="action-icon">🎉</span>
              <span className="action-text">Offers</span>
            </a>
            <a href={link("/public-testimonials")} className="action-card" onClick={hardNav}>
              <span className="action-icon">⭐</span>
              <span className="action-text">Testimonials</span>
            </a>
            <a href={link("/public-feedback")} className="action-card" onClick={hardNav}>
              <span className="action-icon">📝</span>
              <span className="action-text">Feedback</span>
            </a>
          </div>

          {/* Order Information Box */}
          <div className="order-info-box">
            <h3>🍴 We Are Open for Business!</h3>
            <p>
              We are a running restaurant—only the website is under construction.
              For orders, please call or WhatsApp us:
            </p>
            <a href="tel:+918420822919" className="phone-button">
              📞 8420822919
            </a>
          </div>

          {/* Contact Info */}
          <div className="contact">
            <div className="contact-title">Get in Touch</div>
            <div className="contact-info">
              <div className="contact-item">
                📞 <a href="tel:+918420822919">+91 84208 22919</a>
              </div>
              <div className="contact-item">
                ✉️ <a href="mailto:admin@hungrytimes.in">admin@hungrytimes.in</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .uc-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .uc-content {
          max-width: 800px;
          width: 100%;
          text-align: center;
        }

        .uc-icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 2rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        h1 {
          font-size: clamp(2rem, 5vw, 3rem);
          color: #d4af37;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        h2 {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          color: #ffffff;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .description {
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .uc-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          background: rgba(212, 175, 55, 0.1);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          text-decoration: none;
          color: #ffffff;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .action-card:hover {
          background: rgba(212, 175, 55, 0.2);
          border-color: #d4af37;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(212, 175, 55, 0.2);
        }

        .action-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .action-text {
          font-size: 1rem;
          font-weight: 600;
        }

        .order-info-box {
          background: rgba(212, 175, 55, 0.15);
          border: 2px solid rgba(212, 175, 55, 0.4);
          border-radius: 16px;
          padding: 2rem 1.5rem;
          margin-bottom: 2.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .order-info-box h3 {
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          color: #d4af37;
          margin-bottom: 1rem;
        }

        .order-info-box p {
          font-size: clamp(0.9rem, 2vw, 1rem);
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .phone-button {
          display: inline-block;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #d4af37 0%, #c5a028 100%);
          color: #0a0a0a;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 700;
          font-size: clamp(1rem, 2vw, 1.1rem);
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
        }

        .phone-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
          background: linear-gradient(135deg, #e5c048 0%, #d4af37 100%);
        }

        .contact {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
        }

        .contact-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #d4af37;
        }

        .contact-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2rem;
        }

        .contact-item {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .contact-item a {
          color: #ffffff;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .contact-item a:hover {
          color: #d4af37;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .uc-container {
            padding: 1.5rem 1rem;
          }

          .uc-icon {
            width: 90px;
            height: 90px;
            margin-bottom: 1.5rem;
          }

          .uc-actions-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .action-card {
            padding: 1.25rem 0.75rem;
          }

          .action-icon {
            font-size: 1.75rem;
          }

          .action-text {
            font-size: 0.9rem;
          }

          .order-info-box {
            padding: 1.5rem 1rem;
          }

          .contact-info {
            flex-direction: column;
            gap: 1rem;
          }
        }

        @media (max-width: 400px) {
          .uc-actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}