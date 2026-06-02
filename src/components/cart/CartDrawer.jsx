import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { IconCheck, IconClose } from '../Icons';
import CartDrawerItem from './CartDrawerItem';
import CartSummary from './CartSummary';
import FreeShippingBar from './FreeShippingBar';
import RecommendedProducts from './RecommendedProducts';
import EmptyCart from './EmptyCart';
import './CartDrawer.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const drawerVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'tween', duration: 0.3, ease: 'easeOut' } },
  exit: { x: '100%', transition: { type: 'tween', duration: 0.2, ease: 'easeIn' } },
};

export default function CartDrawer({ open, justAdded, onClose }) {
  const { items, total } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const focusRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    focusRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  const handleCheckout = () => {
    handleClose();
    navigate('/checkout');
  };

  const handleContinue = () => {
    handleClose();
  };

  const isEmpty = items.length === 0;
  const itemWord = items.length === 1 ? 'Item' : 'Items';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="cart-drawer-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={drawerRef}
            className="cart-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            <div className="cart-drawer-header">
              <div className="cart-drawer-header-left">
                <span className="cart-drawer-header-icon">&#128722;</span>
                <span className="cart-drawer-header-title">Cart</span>
                {!isEmpty && (
                  <span className="cart-drawer-header-count">({items.length} {itemWord})</span>
                )}
              </div>
              <button
                ref={focusRef}
                className="cart-drawer-header-close"
                onClick={handleClose}
                aria-label="Close cart"
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="cart-drawer-body">
              {justAdded && (
                <motion.div
                  className="cart-drawer-just-added"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="cart-drawer-just-added-icon"><IconCheck size={16} /></span>
                  <span>Added to Cart</span>
                </motion.div>
              )}

              {isEmpty ? (
                <EmptyCart onClose={handleClose} />
              ) : (
                <>
                  <FreeShippingBar />
                  <div className="cart-drawer-items">
                    {items.map(item => (
                      <CartDrawerItem key={item.id || item.slug} item={item} />
                    ))}
                  </div>
                  <RecommendedProducts />
                </>
              )}
            </div>

            {!isEmpty && (
              <div className="cart-drawer-footer">
                <CartSummary />
                <button className="btn btn-gold cart-drawer-checkout" onClick={handleCheckout}>
                  Checkout Now &mdash; &#8377;{total.toFixed(2)}
                </button>
                <button className="cart-drawer-continue" onClick={handleContinue}>
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
