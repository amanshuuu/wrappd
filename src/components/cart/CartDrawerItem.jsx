import { memo } from 'react';
import { useCart } from '../../context/CartContext';
import { IconMinus, IconPlus, IconClose } from '../Icons';

export default memo(function CartDrawerItem({ item }) {
  const { updateQty, removeItem } = useCart();
  const imgSrc = item.image || (Array.isArray(item.images) ? item.images[0] : item.images) || '';

  return (
    <div className="cart-drawer-item">
      <div className="cart-drawer-item-img">
        <img
          src={imgSrc}
          alt={item.name}
          onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="%23f5f5f5"><rect width="80" height="80"/><text x="40" y="40" text-anchor="middle" dy=".3em" font-size="20" fill="%23ccc">&#127873;</text></svg>'; }}
        />
      </div>
      <div className="cart-drawer-item-info">
        <p className="cart-drawer-item-name">{item.name}</p>
        <p className="cart-drawer-item-price">&#8377;{Number(item.price).toFixed(2)}</p>
        <div className="cart-drawer-item-qty">
          <button
            className="cart-drawer-qty-btn"
            onClick={() => updateQty(item.id, item.qty - 1)}
            aria-label="Decrease quantity"
          >
            <IconMinus size={14} />
          </button>
          <span className="cart-drawer-qty-value">{item.qty}</span>
          <button
            className="cart-drawer-qty-btn"
            onClick={() => updateQty(item.id, item.qty + 1)}
            aria-label="Increase quantity"
          >
            <IconPlus size={14} />
          </button>
        </div>
      </div>
      <div className="cart-drawer-item-right">
        <p className="cart-drawer-item-line-total">&#8377;{(Number(item.price) * item.qty).toFixed(2)}</p>
        <button
          className="cart-drawer-item-remove"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.name}`}
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  );
});
