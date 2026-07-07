// pages/Reservation.jsx — table booking via WhatsApp (no backend needed).
// The old version was a dead form: type="button" with no handler.
import { useState } from 'react';
import { Calendar, Clock, Users, Phone, User, MessageCircle } from 'lucide-react';

const RESTAURANT_WA = '916290471281';

export default function Reservation() {
  const [form, setForm] = useState({ name: '', phone: '', date: '', time: '', guests: '' });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleBook = () => {
    if (!form.name.trim()) return setError('Please enter your name');
    if (!/^\d{10}$/.test(form.phone)) return setError('Please enter a valid 10-digit phone number');
    if (!form.date) return setError('Please pick a date');
    if (!form.time) return setError('Please pick a time');
    if (!form.guests || Number(form.guests) < 1) return setError('How many guests?');
    setError('');

    const msg =
      `Table reservation request\n` +
      `Name: ${form.name.trim()}\n` +
      `Phone: ${form.phone}\n` +
      `Date: ${form.date}\n` +
      `Time: ${form.time}\n` +
      `Guests: ${form.guests}`;
    window.open(`https://wa.me/${RESTAURANT_WA}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const inputCls =
    'w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <section className="container-section py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-2 text-white">Reserve a Table</h2>
        <p className="text-neutral-400 text-sm mb-6">
          Fill in the details — we'll confirm your booking on WhatsApp.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="card p-6 grid gap-4 bg-neutral-800 rounded-lg">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1"><User className="w-3.5 h-3.5 inline mr-1" />Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Your name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1"><Phone className="w-3.5 h-3.5 inline mr-1" />Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit number" className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1"><Calendar className="w-3.5 h-3.5 inline mr-1" />Date</label>
              <input type="date" value={form.date} onChange={set('date')} min={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1"><Clock className="w-3.5 h-3.5 inline mr-1" />Time</label>
              <input type="time" value={form.time} onChange={set('time')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1"><Users className="w-3.5 h-3.5 inline mr-1" />Guests</label>
            <input type="number" min="1" max="30" value={form.guests} onChange={set('guests')} placeholder="Number of guests" className={inputCls} />
          </div>
          <button
            type="button"
            onClick={handleBook}
            className="w-full sm:w-max flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Book via WhatsApp
          </button>
          <p className="text-xs text-neutral-500">
            Or call us directly: <a href="tel:+918420822919" className="text-orange-400">+91 84208 22919</a>
          </p>
        </div>
      </div>
    </section>
  );
}
