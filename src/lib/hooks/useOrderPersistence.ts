import { useCallback } from "react";
import type { Customer } from "@/data/mock-customers";
import type { OrderItem } from "../types/order";
import { ensureOrderItemsHaveImages } from "../utils/product-utils";
import {
  getLocalStorage,
  hasLocalStorage,
  removeLocalStorage,
  STORAGE_KEYS,
  setLocalStorage,
} from "../utils/storage";

interface CartState {
  items: OrderItem[];
  customer: Customer | null;
  discount: {
    type: "percentage" | "fixed" | null;
    value: number;
  };
}

/**
 * Hook para gerenciar a persistência do carrinho no LocalStorage
 * Salva automaticamente o estado do carrinho, cliente e desconto
 */
export function useOrderPersistence() {
  /**
   * Salva o estado atual do carrinho no LocalStorage
   */
  const saveCart = useCallback((state: CartState) => {
    setLocalStorage(STORAGE_KEYS.CART, state);
  }, []);

  /**
   * Carrega o estado do carrinho do LocalStorage
   */
  const loadCart = useCallback((): CartState | null => {
    const defaultState: CartState = {
      items: [],
      customer: null,
      discount: { type: null, value: 0 },
    };

    const savedState = getLocalStorage(STORAGE_KEYS.CART, defaultState);

    // Garante que todos os items tenham imagem (compatibilidade com dados antigos)
    if (savedState && savedState.items.length > 0) {
      savedState.items = ensureOrderItemsHaveImages(savedState.items);
    }

    return savedState;
  }, []);

  /**
   * Limpa o carrinho do LocalStorage
   */
  const clearCart = useCallback(() => {
    removeLocalStorage(STORAGE_KEYS.CART);
  }, []);

  /**
   * Verifica se existe um carrinho salvo
   */
  const hasCart = useCallback((): boolean => {
    return hasLocalStorage(STORAGE_KEYS.CART);
  }, []);

  return { saveCart, loadCart, clearCart, hasCart };
}
