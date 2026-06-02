import { Link } from 'react-router-dom';
import { memo } from 'react';
import { IconShoppingBag } from '../Icons';

export default memo(function EmptyCart({ onClose }) {
  return (
    <div className="cart-drawer-empty">
      <div className="cart-drawer-empty-icon">
        <IconShoppingBag size={48} />
      </div>
      <h3>Your cart is empty</h3>
      <p>Discover our premium gift hampers</p>
      <Link to="/collections/best-sellers" className="btn btn-gold" onClick={onClose}>
        Start Shopping
      </Link>
    </div>
  );
});
