import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Customer } from "@/data/mock-customers";
import type { Product } from "@/data/mock-products";
import type { OrderItem } from "@/lib/types/order";

// Interface dos modais
interface ModalsState {
  searchCustomer: boolean;
  addCustomer: boolean;
  searchProduct: boolean;
  discount: boolean;
  budgets: boolean;
  pendingSales: boolean;
}

// Interface do desconto
interface DiscountState {
  type: "percentage" | "fixed" | null;
  value: number;
}

// Interface principal do store do PDV
interface PDVStore {
  // Estado do carrinho
  cartItems: OrderItem[];

  // Estado do cliente
  selectedCustomer: Customer | null;

  // Estado do desconto
  discount: DiscountState;

  // Estado dos modais
  modals: ModalsState;

  // Estado da UI
  isSidebarOpen: boolean;
  isMobile: boolean;
  isInitialized: boolean;

  // Actions do carrinho
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  // Actions do cliente
  setCustomer: (customer: Customer | null) => void;

  // Actions do desconto
  setDiscount: (type: "percentage" | "fixed", value: number) => void;
  clearDiscount: () => void;

  // Actions dos modais
  openModal: (modal: keyof ModalsState) => void;
  closeModal: (modal: keyof ModalsState) => void;
  closeAllModals: () => void;

  // Actions da UI
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobile: (mobile: boolean) => void;
  setInitialized: (initialized: boolean) => void;

  // Computed values
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;

  // Actions complexas
  finalizeSale: () => void;
}

// Estado inicial dos modais
const initialModalsState: ModalsState = {
  searchCustomer: false,
  addCustomer: false,
  searchProduct: false,
  discount: false,
  budgets: false,
  pendingSales: false,
};

// Estado inicial do desconto
const initialDiscountState: DiscountState = {
  type: null,
  value: 0,
};

export const usePDVStore = create<PDVStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      cartItems: [],
      selectedCustomer: null,
      discount: initialDiscountState,
      modals: initialModalsState,
      isSidebarOpen: false,
      isMobile: false,
      isInitialized: false,

      // Actions do carrinho
      addItem: (product: Product) => {
        const { cartItems } = get();
        const existingItem = cartItems.find(
          (item) => item.productId === product.id,
        );

        if (existingItem) {
          // Atualizar quantidade do item existente
          set((state) => ({
            cartItems: state.cartItems.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    subtotal: (item.quantity + 1) * item.unitPrice,
                  }
                : item,
            ),
          }));
          toast.success(`Quantidade de ${product.name} atualizada.`);
        } else {
          // Adicionar novo item
          const newItem: OrderItem = {
            productId: product.id,
            name: product.name,
            image: product.image,
            quantity: 1,
            unitPrice: product.price,
            subtotal: product.price,
            variant: product.variants
              ? {
                  size: product.variants.size?.[0],
                  color: product.variants.color?.[0],
                }
              : undefined,
          };

          set((state) => ({
            cartItems: [...state.cartItems, newItem],
          }));
          toast.success(`Produto ${product.name} adicionado ao carrinho.`);
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          cartItems: state.cartItems
            .map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: quantity,
                    subtotal: quantity * item.unitPrice,
                  }
                : item,
            )
            .filter((item) => item.quantity > 0), // Remove se quantidade for 0
        }));
        toast.info("Quantidade do item atualizada.");
      },

      removeItem: (productId: string) => {
        set((state) => ({
          cartItems: state.cartItems.filter(
            (item) => item.productId !== productId,
          ),
        }));
        toast.warning("Item removido do carrinho.");
      },

      clearCart: () => {
        set({
          cartItems: [],
          selectedCustomer: null,
          discount: initialDiscountState,
        });
      },

      // Actions do cliente
      setCustomer: (customer: Customer | null) => {
        set({ selectedCustomer: customer });
        if (customer) {
          toast.success(`Cliente ${customer.name} selecionado.`);
        }
      },

      // Actions do desconto
      setDiscount: (type: "percentage" | "fixed", value: number) => {
        set({ discount: { type, value } });
        toast.success(
          `Desconto de ${type === "percentage" ? `${value}%` : `R$ ${value.toFixed(2)}`} aplicado.`,
        );
      },

      clearDiscount: () => {
        set({ discount: initialDiscountState });
      },

      // Actions dos modais
      openModal: (modal: keyof ModalsState) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: true },
        }));
      },

      closeModal: (modal: keyof ModalsState) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: false },
        }));
      },

      closeAllModals: () => {
        set({ modals: initialModalsState });
      },

      // Actions da UI
      setSidebarOpen: (open: boolean) => {
        set({ isSidebarOpen: open });
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      setMobile: (mobile: boolean) => {
        set({ isMobile: mobile });
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized });
      },

      // Computed values
      getSubtotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((acc, item) => acc + item.subtotal, 0);
      },

      getDiscountAmount: () => {
        const { discount } = get();
        const subtotal = get().getSubtotal();

        if (!discount.type || discount.value === 0) return 0;

        if (discount.type === "percentage") {
          return (subtotal * discount.value) / 100;
        }
        return discount.value;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const shipping = 0; // Implementar lógica de frete futura

        return subtotal - discountAmount + shipping;
      },

      // Actions complexas
      finalizeSale: () => {
        const { cartItems, selectedCustomer } = get();

        if (cartItems.length === 0) {
          toast.error(
            "Não é possível finalizar uma venda sem itens no carrinho.",
          );
          return;
        }

        if (!selectedCustomer) {
          toast.error("Selecione um cliente para finalizar a venda.");
          return;
        }

        // Finalizar venda
        toast.success("Venda finalizada com sucesso!");

        // Limpar estado
        get().clearCart();
        get().closeAllModals();
      },
    }),
    {
      name: "pdv-storage", // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage), // SSR-safe
      version: 1, // Versioning para migração futura

      // Particializar o que será persistido
      partialize: (state) => ({
        cartItems: state.cartItems,
        selectedCustomer: state.selectedCustomer,
        discount: state.discount,
      }),

      // Migração de versões (futuro)
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Migração de v0 para v1
          return {
            ...(persistedState as object),
            discount: initialDiscountState,
          };
        }
        return persistedState as PDVStore;
      },
    },
  ),
);

// Hook para usar apenas os valores computados (otimização)
export const usePDVComputedValues = () => {
  return usePDVStore((state) => ({
    subtotal: state.getSubtotal(),
    discountAmount: state.getDiscountAmount(),
    total: state.getTotal(),
  }));
};

// Hook para usar apenas o estado do carrinho
export const usePDVCart = () => {
  return usePDVStore((state) => ({
    cartItems: state.cartItems,
    addItem: state.addItem,
    updateQuantity: state.updateQuantity,
    removeItem: state.removeItem,
    clearCart: state.clearCart,
  }));
};

// Hook para usar apenas o estado dos modais
export const usePDVModals = () => {
  return usePDVStore((state) => ({
    modals: state.modals,
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
  }));
};

// Hook para usar apenas o estado do cliente
export const usePDVCustomer = () => {
  return usePDVStore((state) => ({
    selectedCustomer: state.selectedCustomer,
    setCustomer: state.setCustomer,
  }));
};
