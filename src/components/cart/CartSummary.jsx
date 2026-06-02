import { useCart } from '../../context/CartContext';
import { memo } from 'react';

export default memo(function CartSummary() {
  const { subtotal, delivery, gst, total } = useCart();

  return (
    <div className="cart-drawer-summary">
      <div className="cart-drawer-summary-row">
        <span>Subtotal</span>
        <span>&#8377;{subtotal.toFixed(2)}</span>
      </div>
      <div className="cart-drawer-summary-row">
        <span>Shipping</span>
        <span>{delivery === 0 ? 'FREE' : `\u20B9${delivery.toFixed(2)}`}</span>
      </div>
      <div className="cart-drawer-summary-row">
        <span>GST</span>
        <span>&#8377;{gst.toFixed(2)}</span>
      </div>
      <div className="cart-drawer-summary-row cart-drawer-summary-total">
        <span>Total</span>
        <span>&#8377;{total.toFixed(2)}</span>
      </div>
    </div>
  );
});
