import { useCart } from '../../context/CartContext';
import { memo } from 'react';

const THRESHOLD = 150;

export default memo(function FreeShippingBar() {
  const { subtotal } = useCart();

  const progress = Math.min((subtotal / THRESHOLD) * 100, 100);
  const remaining = THRESHOLD - subtotal;

  if (subtotal >= THRESHOLD) {
    return (
      <div className="free-shipping-bar free-shipping-unlocked">
        <span>&#127881; You unlocked FREE SHIPPING!</span>
      </div>
    );
  }

  return (
    <div className="free-shipping-bar">
      <p className="free-shipping-text">Spend &#8377;{remaining.toFixed(0)} more for FREE SHIPPING</p>
      <div className="free-shipping-track">
        <div className="free-shipping-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
});
