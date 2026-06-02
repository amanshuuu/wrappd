import { useState, useEffect, memo } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { openCartDrawer } from '../../hooks/useCartDrawer';
import { api } from '../../lib/api';

export default memo(function RecommendedProducts() {
  const [products, setProducts] = useState([]);
  const { addItem, items } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.products.list({ featured: true }).then(data => {
      if (!cancelled) {
        const inCartIds = new Set(items.map(i => i.id));
        setProducts(data.filter(p => !inCartIds.has(p.id)).slice(0, 4));
      }
    }).catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, []);

  if (!products.length) return null;

  const handleAdd = (product) => {
    addItem(product);
    addToast(`${product.name} added to cart!`);
    openCartDrawer(product.name);
  };

  return (
    <div className="cart-drawer-recommended">
      <h4>Frequently Bought Together</h4>
      <div className="cart-drawer-recommended-list">
        {products.map(p => (
          <div key={p.id} className="cart-drawer-rec-item">
            <img
              src={p.image || (Array.isArray(p.images) ? p.images[0] : '') || ''}
              alt={p.name}
              className="cart-drawer-rec-img"
              loading="lazy"
              onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="%23f5f5f5"><rect width="60" height="60"/><text x="30" y="30" text-anchor="middle" dy=".3em" font-size="16" fill="%23ccc">&#127873;</text></svg>'; }}
            />
            <div className="cart-drawer-rec-info">
              <p className="cart-drawer-rec-name">{p.name}</p>
              <p className="cart-drawer-rec-price">&#8377;{Number(p.price).toFixed(2)}</p>
            </div>
            <button className="cart-drawer-rec-add" onClick={() => handleAdd(p)} aria-label={`Add ${p.name}`}>
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
