import { useEffect, useState } from "react";
import { usePDVStore } from "./pdv-store";

// Hook base para hidratação SSR-safe
const useHydration = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
};

// Hook SSR-safe completo para o store principal
export const useHydratedPDVStore = () => {
  const isHydrated = useHydration();
  const store = usePDVStore();

  if (!isHydrated) {
    return {
      ...store,
      cartItems: [],
      selectedCustomer: null,
      discount: { type: null, value: 0 },
      modals: {
        searchCustomer: false,
        addCustomer: false,
        searchProduct: false,
        discount: false,
        budgets: false,
        pendingSales: false,
      },
      isSidebarOpen: false,
      isMobile: false,
      isInitialized: false,
      getSubtotal: () => 0,
      getDiscountAmount: () => 0,
      getTotal: () => 0,
    };
  }

  return store;
};

// Hook SSR-safe para valores computados
export const useComputedValues = () => {
  const isHydrated = useHydration();
  const store = usePDVStore();

  if (!isHydrated) {
    return {
      subtotal: 0,
      discountAmount: 0,
      total: 0,
    };
  }

  return {
    subtotal: store.getSubtotal(),
    discountAmount: store.getDiscountAmount(),
    total: store.getTotal(),
  };
};

// Hook SSR-safe para estado dos modais
export const useModalsState = () => {
  const isHydrated = useHydration();
  const store = usePDVStore();

  if (!isHydrated) {
    return {
      modals: {
        searchCustomer: false,
        addCustomer: false,
        searchProduct: false,
        discount: false,
        budgets: false,
        pendingSales: false,
      },
      openModal: () => {},
      closeModal: () => {},
      closeAllModals: () => {},
    };
  }

  return {
    modals: store.modals,
    openModal: store.openModal,
    closeModal: store.closeModal,
    closeAllModals: store.closeAllModals,
  };
};

// Hook SSR-safe para estado do carrinho
export const useCartState = () => {
  const isHydrated = useHydration();
  const store = usePDVStore();

  if (!isHydrated) {
    return {
      cartItems: [],
      addItem: () => {},
      updateQuantity: () => {},
      removeItem: () => {},
      clearCart: () => {},
    };
  }

  return {
    cartItems: store.cartItems,
    addItem: store.addItem,
    updateQuantity: store.updateQuantity,
    removeItem: store.removeItem,
    clearCart: store.clearCart,
  };
};

// Hook SSR-safe para estado do cliente
export const useCustomerState = () => {
  const isHydrated = useHydration();
  const store = usePDVStore();

  if (!isHydrated) {
    return {
      selectedCustomer: null,
      setCustomer: () => {},
    };
  }

  return {
    selectedCustomer: store.selectedCustomer,
    setCustomer: store.setCustomer,
  };
};
