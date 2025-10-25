// src/pages/UnderConstruction.jsx
import React from 'react';
import './UnderConstruction.css';

export default function UnderConstruction() {
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

        {/* Three Buttons */}
        <div className="buttons">
          <a href="/public-testimonials" className="btn btn-primary">
            ⭐ Public Testimonials
          </a>
          <a href="/public-feedback" className="btn btn-secondary">
            📝 Submit Feedback
          </a>
          <a href="/offers" className="btn btn-secondary">
            🎉 Offers - 15% OFF
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
  );
}