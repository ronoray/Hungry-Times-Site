// src/pages/UnderConstruction.jsx
import React from 'react';
import './UnderConstruction.css';

export default function UnderConstruction() {
  // In dev, go straight to OPS (assets load correctly).
  // In prod, use mirror paths so Traefik/NGINX handle it.
  const isDev = import.meta.env.DEV;
  const link = (path) => (isDev ? `https://ops.hungrytimes.in${path}` : path);

  // Force a server navigation only in PROD (so mirrors kick in)
  const hardNav = (e) => {
    if (!isDev) {
      e.preventDefault();
      window.location.assign(e.currentTarget.href);
    }
  };

  return (
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

        {/* Left Tabs + Content Intro */}
        <div className="uc-layout">
          <nav className="uc-tabs">
            <a href="/menu" className="tab">🍽️ Menu</a>
            <a href="/offers" className="tab">🎉 Offers</a>
            <a href={link("/public-testimonials")} className="tab" onClick={hardNav}>⭐ Public Testimonials</a>
            <a href={link("/public-feedback")} className="tab" onClick={hardNav}>📝 Submit Feedback</a>
          </nav>
          <div className="uc-panel">
            <p className="order-note">
              We are a running restaurant—only the website is under construction.
              For orders, please <strong>call or WhatsApp <a href="tel:+918420822919">8420822919</a></strong>.
            </p>
            <p className="description">
              Explore our menu and current offers from the tabs on the left.
            </p>
          </div>
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
  );
}