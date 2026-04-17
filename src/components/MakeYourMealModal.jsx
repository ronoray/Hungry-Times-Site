import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Minus, Sparkles, Users, UtensilsCrossed, Check } from "lucide-react";
import { useCart } from "../context/CartContext";
import API_BASE from "../config/api";

const CDN = "https://cdn.hungrytimes.in/images/";

function itemImage(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${CDN}${url}`;
}

// ── People picker ─────────────────────────────────────────────────────────────
function PeoplePicker({ onSelect }) {
  const options = [1, 2, 3, 4, 5, 6];
  return (
    <div className="myom-step">
      <div className="myom-step-title">
        <Users size={22} className="myom-step-icon" />
        <span>How many people are you ordering for?</span>
      </div>
      <div className="myom-people-grid">
        {options.map((n) => (
          <button key={n} className="myom-people-btn" onClick={() => onSelect(n)}>
            {n === 6 ? "6+" : n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Meal type picker (only for 1 person) ──────────────────────────────────────
function MealTypePicker({ onSelect, onBack }) {
  return (
    <div className="myom-step">
      <button className="myom-back-btn" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>
      <div className="myom-step-title">
        <UtensilsCrossed size={22} className="myom-step-icon" />
        <span>Eating solo. Pick your style</span>
      </div>
      <div className="myom-type-grid">
        <button className="myom-type-card" onClick={() => onSelect("combo")}>
          <span className="myom-type-emoji">🍛</span>
          <span className="myom-type-label">Combo Plate</span>
          <span className="myom-type-sub">One item, complete meal</span>
        </button>
        <button className="myom-type-card" onClick={() => onSelect("individual")}>
          <span className="myom-type-emoji">🍜</span>
          <span className="myom-type-label">Build Your Own</span>
          <span className="myom-type-sub">Pick a base + a dish</span>
        </button>
      </div>
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────
function ItemRow({ item, pickOne, selected, onToggle, onQtyChange }) {
  const img = itemImage(item.image_url);
  const isSelected = pickOne ? selected === item.id : item.quantity > 0;

  return (
    <div className={`myom-item-row ${isSelected ? "myom-item-selected" : ""} ${pickOne ? "myom-item-pickone" : ""}`}
      onClick={pickOne ? () => onToggle(item.id) : undefined}>
      {img
        ? <img src={img} alt={item.name} className="myom-item-img" loading="lazy" />
        : <div className="myom-item-img myom-item-img-placeholder" />}
      <div className="myom-item-info">
        <div className="myom-item-name-row">
          {item.is_veg ? <span className="myom-veg-dot" /> : <span className="myom-nonveg-dot" />}
          <span className="myom-item-name">{item.name}</span>
          {item.is_personal_pick && <span className="myom-personal-badge">Your fave</span>}
        </div>
        <span className="myom-item-cat">{item.category}</span>
        <span className="myom-item-price">₹{item.price}</span>
      </div>
      {pickOne ? (
        <div className={`myom-pick-circle ${isSelected ? "myom-pick-circle-on" : ""}`}>
          {isSelected && <Check size={14} />}
        </div>
      ) : (
        <div className="myom-qty-controls">
          <button className="myom-qty-btn" onClick={(e) => { e.stopPropagation(); onQtyChange(item.id, -1); }}
            disabled={item.quantity <= 0}>
            <Minus size={14} />
          </button>
          <span className={`myom-qty-val ${item.quantity === 0 ? "myom-qty-zero" : ""}`}>
            {item.quantity}
          </span>
          <button className="myom-qty-btn" onClick={(e) => { e.stopPropagation(); onQtyChange(item.id, 1); }}>
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Picks step ────────────────────────────────────────────────────────────────
function PicksStep({ data, people, onBack, onAddToCart, recommendedItems, isLoggedIn }) {
  const [sections, setSections] = useState(data.sections.map(sec => ({
    ...sec,
    items: sec.items.map(i => ({ ...i })),
    selectedId: sec.pickOne ? (sec.items[0]?.id ?? null) : null,
  })));
  const [chefPanelOpen, setChefPanelOpen] = useState(false);

  const total = sections.reduce((sum, sec) => {
    if (sec.pickOne) {
      const sel = sec.items.find(i => i.id === sec.selectedId);
      return sum + (sel ? sel.price : 0);
    }
    return sum + sec.items.reduce((s, i) => s + (i.price || 0) * Math.max(0, i.quantity || 0), 0);
  }, 0);

  const itemCount = sections.reduce((n, sec) => {
    if (sec.pickOne) return n + (sec.selectedId ? 1 : 0);
    return n + sec.items.filter(i => (i.quantity || 0) > 0).length;
  }, 0);

  function handleQtyChange(secIdx, itemId, delta) {
    setSections(prev => prev.map((sec, si) => {
      if (si !== secIdx) return sec;
      return {
        ...sec,
        items: sec.items.map(i => i.id === itemId
          ? { ...i, quantity: Math.max(0, (i.quantity || 0) + delta) }
          : i),
      };
    }));
  }

  function handlePickOne(secIdx, itemId) {
    setSections(prev => prev.map((sec, si) =>
      si !== secIdx ? sec : { ...sec, selectedId: itemId }));
  }

  function buildCartLines() {
    const lines = [];
    for (const sec of sections) {
      if (sec.pickOne) {
        const sel = sec.items.find(i => i.id === sec.selectedId);
        if (sel) lines.push({ itemId: sel.id, itemName: sel.name, name: sel.name, basePrice: sel.price, qty: 1, variants: [], addons: [] });
      } else {
        for (const item of sec.items) {
          if ((item.quantity || 0) > 0) {
            lines.push({ itemId: item.id, itemName: item.name, name: item.name, basePrice: item.price, qty: item.quantity, variants: [], addons: [] });
          }
        }
      }
    }
    return lines;
  }

  return (
    <div className="myom-picks-wrap">
      {/* Header bar */}
      <div className="myom-picks-header">
        <button className="myom-back-btn" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <span className="myom-picks-for">Meal for {people === 6 ? "6+" : people} {people === 1 ? "person" : "people"}</span>
        <button className="myom-chef-btn" onClick={() => setChefPanelOpen(true)}>
          <Sparkles size={14} /> Chef&apos;s Picks
        </button>
      </div>

      {/* Personalised badge */}
      {data.is_personalised && (
        <div className="myom-personal-notice">✨ Tuned to your order history</div>
      )}

      {/* Sections */}
      <div className="myom-sections">
        {sections.map((sec, si) => (
          <div key={sec.role + si} className="myom-section">
            <div className="myom-section-label">{sec.label}</div>
            {sec.items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                pickOne={!!sec.pickOne}
                selected={sec.selectedId}
                onToggle={(id) => handlePickOne(si, id)}
                onQtyChange={(id, delta) => handleQtyChange(si, id, delta)}
              />
            ))}
          </div>
        ))}

        {/* Guest upsell */}
        {!isLoggedIn && (
          <div className="myom-guest-notice">
            🔒 Login to get picks personalised to your taste
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="myom-footer">
        <div className="myom-footer-total">
          <span className="myom-total-label">Total</span>
          <span className="myom-total-amt">₹{total}</span>
        </div>
        <button
          className="myom-add-btn"
          disabled={itemCount === 0}
          onClick={() => onAddToCart(buildCartLines())}
        >
          Add {itemCount} item{itemCount !== 1 ? "s" : ""} to cart
        </button>
      </div>

      {/* Chef's Picks side panel */}
      <div className={`myom-chef-panel ${chefPanelOpen ? "myom-chef-panel-open" : ""}`}>
        <div className="myom-chef-panel-header">
          <button className="myom-back-btn" onClick={() => setChefPanelOpen(false)}>
            <ChevronLeft size={16} /> Back to your meal
          </button>
          <span className="myom-chef-panel-title">⭐ Chef&apos;s Picks</span>
        </div>
        <div className="myom-chef-panel-body">
          {(recommendedItems || []).map(it => (
            <div key={it.id} className="myom-chef-item">
              {it.image_url && <img src={itemImage(it.image_url)} alt={it.name} className="myom-chef-img" />}
              <div>
                <div className="myom-item-name">{it.name}</div>
                <div className="myom-item-price">₹{it.price}</div>
              </div>
            </div>
          ))}
          {(!recommendedItems || recommendedItems.length === 0) && (
            <p className="myom-chef-empty">No chef picks set at the moment.</p>
          )}
        </div>
      </div>
      {chefPanelOpen && <div className="myom-chef-overlay" onClick={() => setChefPanelOpen(false)} />}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="myom-loading">
      {[1, 2, 3].map(i => (
        <div key={i} className="myom-skeleton-row">
          <div className="myom-skeleton-img" />
          <div className="myom-skeleton-lines">
            <div className="myom-skeleton-line myom-skeleton-line-lg" />
            <div className="myom-skeleton-line myom-skeleton-line-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function MakeYourMealModal({ isOpen, onClose, recommendedItems, customerPhone }) {
  const { addLine } = useCart();
  const [step, setStep] = useState("people"); // 'people' | 'type' | 'picks'
  const [people, setPeople] = useState(null);
  const [mealType, setMealType] = useState(null);
  const [picksData, setPicksData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("people"); setPeople(null); setMealType(null);
        setPicksData(null); setLoading(false); setAddedAll(false);
      }, 300);
    }
  }, [isOpen]);

  async function fetchPicks(n, type) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ people: n, type });
      if (customerPhone) params.set("phone", customerPhone);
      const res = await fetch(`${API_BASE}/public/meal-builder?${params}`);
      const data = await res.json();
      setPicksData(data);
      setStep("picks");
    } catch {
      setPicksData(null);
    } finally {
      setLoading(false);
    }
  }

  function handlePeopleSelect(n) {
    setPeople(n);
    if (n === 1) {
      setStep("type");
    } else {
      fetchPicks(n, "group");
    }
  }

  function handleTypeSelect(type) {
    setMealType(type);
    fetchPicks(1, type);
  }

  function handleAddToCart(lines) {
    lines.forEach(line => addLine(line));
    setAddedAll(true);
    setTimeout(() => { onClose(); }, 900);
  }

  if (!isOpen) return null;

  return (
    <div className="myom-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="myom-modal">
        {/* Modal header */}
        <div className="myom-header">
          <div className="myom-header-left">
            <Sparkles size={18} className="myom-header-icon" />
            <span className="myom-header-title">Make Your Meal</span>
          </div>
          <button className="myom-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="myom-body">
          {addedAll ? (
            <div className="myom-success">
              <Check size={40} className="myom-success-icon" />
              <p>Added to your cart!</p>
            </div>
          ) : loading ? (
            <LoadingSkeleton />
          ) : step === "people" ? (
            <PeoplePicker onSelect={handlePeopleSelect} />
          ) : step === "type" ? (
            <MealTypePicker onSelect={handleTypeSelect} onBack={() => setStep("people")} />
          ) : picksData ? (
            <PicksStep
              data={picksData}
              people={people}
              onBack={() => setStep(people === 1 ? "type" : "people")}
              onAddToCart={handleAddToCart}
              recommendedItems={recommendedItems}
              isLoggedIn={!!customerPhone}
            />
          ) : (
            <div className="myom-error">Could not load suggestions. Please try again.</div>
          )}
        </div>
      </div>
    </div>
  );
}
