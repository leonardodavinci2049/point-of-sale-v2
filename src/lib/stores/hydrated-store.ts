import { useEffect, useState } from "react";
import { usePDVStore } from "./pdv-store";

// Hook personalizado para lidar com hidratação do Zustand
export const useHydratedStore = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const store = usePDVStore();

  useEffect(() => {
    // Garantir que a store está hidratada
    setIsHydrated(true);
  }, []);

  // Retornar valores padrão durante SSR
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
      getSubtotal: () => 0,
      getDiscountAmount: () => 0,
      getTotal: () => 0,
    };
  }

  return store;
};

// Hook SSR-safe para valores computados
export const useComputedValues = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const store = usePDVStore();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
