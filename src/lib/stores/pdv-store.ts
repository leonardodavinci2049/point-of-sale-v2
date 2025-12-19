import { useEffect, useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Customer } from "@/data/mock-customers";
import type { Product } from "@/data/mock-products";
import type { OrderItem } from "@/lib/types/order";
import { createBackup } from "@/lib/utils/backup-system";
import {
  CURRENT_PDV_VERSION,
  DEFAULT_PDV_DATA,
  PDV_MIGRATIONS,
  type PDVDataV1,
  sanitizeCartItems,
  sanitizeCustomer,
  sanitizeDiscount,
  validatePDVDataV1,
} from "@/lib/utils/pdv-migrations";

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
      // Estado inicial (usa dados padrão das migrações)
      cartItems: DEFAULT_PDV_DATA.cartItems,
      selectedCustomer: DEFAULT_PDV_DATA.selectedCustomer,
      discount: DEFAULT_PDV_DATA.discount,
      modals: initialModalsState,
      isSidebarOpen: false, // ✅ Sempre fechada inicialmente
      isMobile:
        typeof window !== "undefined" ? window.innerWidth < 1024 : false,
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
        set((state) => ({
          isMobile: mobile,
          // Fecha a sidebar automaticamente quando muda para mobile
          isSidebarOpen: mobile ? false : state.isSidebarOpen,
        }));
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

        try {
          // Cria backup da venda antes de finalizar
          const total = get().getTotal();
          const backupKey = createBackup(
            {
              keys: ["pdv-storage"],
              name: "sale_backup",
              maxBackups: 10,
            },
            `Venda finalizada - ${selectedCustomer.name} - R$ ${total.toFixed(2)}`,
          );

          if (backupKey) {
            console.log(`Backup da venda criado: ${backupKey}`);
          }

          // Finalizar venda
          toast.success("Venda finalizada com sucesso!");

          // Limpar estado
          get().clearCart();
          get().closeAllModals();
        } catch (error) {
          console.error("Erro ao finalizar venda:", error);
          toast.error("Erro ao finalizar venda. Tente novamente.");
        }
      },
    }),
    {
      name: "pdv-storage", // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage), // SSR-safe
      version: CURRENT_PDV_VERSION, // Versão atual dos dados

      // Particializar o que será persistido
      partialize: (state) => ({
        cartItems: state.cartItems,
        selectedCustomer: state.selectedCustomer,
        discount: state.discount,
      }),

      // Migração robusta com backup automático
      migrate: (persistedState: unknown, version: number) => {
        console.log(
          `Migrando dados do PDV da versão ${version} para ${CURRENT_PDV_VERSION}`,
        );

        try {
          // Cria backup antes da migração
          const backupKey = createBackup(
            {
              keys: ["pdv-storage"],
              name: "migration_backup",
              maxBackups: 3,
            },
            `Backup automático antes da migração v${version} -> v${CURRENT_PDV_VERSION}`,
          );

          if (backupKey) {
            console.log(`Backup criado: ${backupKey}`);
          }

          // Se já está na versão atual, apenas sanitiza
          if (version === CURRENT_PDV_VERSION) {
            const state = persistedState as Record<string, unknown>;
            return {
              cartItems: sanitizeCartItems(
                Array.isArray(state.cartItems) ? state.cartItems : [],
              ),
              selectedCustomer: sanitizeCustomer(state.selectedCustomer),
              discount: sanitizeDiscount(state.discount),
            };
          }

          // Para versões antigas, usa sistema de migração
          let migratedData = persistedState;

          // Aplica migrações sequencialmente
          for (const migration of PDV_MIGRATIONS) {
            if (
              migration.fromVersion === version ||
              (version === 0 && migration.fromVersion === 0)
            ) {
              console.log(`Aplicando migração: ${migration.description}`);
              migratedData = migration.migrate(migratedData);
              version = migration.toVersion;
            }
          }

          // Valida dados migrados
          if (validatePDVDataV1(migratedData)) {
            const validData = migratedData as PDVDataV1;
            return {
              cartItems: validData.cartItems,
              selectedCustomer: validData.selectedCustomer,
              discount: validData.discount,
            };
          }

          // Se migração falhou, usa dados padrão
          console.warn("Migração falhou, usando dados padrão");
          return {
            cartItems: DEFAULT_PDV_DATA.cartItems,
            selectedCustomer: DEFAULT_PDV_DATA.selectedCustomer,
            discount: DEFAULT_PDV_DATA.discount,
          };
        } catch (error) {
          console.error("Erro durante migração:", error);

          // Em caso de erro, usa dados padrão
          return {
            cartItems: DEFAULT_PDV_DATA.cartItems,
            selectedCustomer: DEFAULT_PDV_DATA.selectedCustomer,
            discount: DEFAULT_PDV_DATA.discount,
          };
        }
      },

      // Callback executado após hidratação
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Erro ao hidratar store:", error);
            toast.error("Erro ao carregar dados salvos. Usando dados padrão.");
          } else if (state) {
            console.log("Store hidratado com sucesso");
            // Marca como inicializado após hidratação
            state.setInitialized(true);

            // Limpa modais que podem ter ficado abertos
            state.closeAllModals();

            // Garante que a sidebar esteja fechada no mobile após hidratação
            const isMobile =
              typeof window !== "undefined" && window.innerWidth < 1024;
            if (isMobile && state.isSidebarOpen) {
              state.setSidebarOpen(false);
            }
          }
        };
      },
    },
  ),
);

// Seletores estáveis para evitar re-renders
const selectComputedValues = (state: PDVStore) => {
  const subtotal = state.getSubtotal();
  const discountAmount = state.getDiscountAmount();
  const total = state.getTotal();
  return { subtotal, discountAmount, total };
};

// Seletores individuais para valores computados (mais estáveis)
const selectSubtotal = (state: PDVStore) => state.getSubtotal();
const selectDiscountAmount = (state: PDVStore) => state.getDiscountAmount();
const selectTotal = (state: PDVStore) => state.getTotal();

const selectCartState = (state: PDVStore) => ({
  cartItems: state.cartItems,
  addItem: state.addItem,
  updateQuantity: state.updateQuantity,
  removeItem: state.removeItem,
  clearCart: state.clearCart,
});

const selectModalsState = (state: PDVStore) => ({
  modals: state.modals,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
});

const selectCustomerState = (state: PDVStore) => ({
  selectedCustomer: state.selectedCustomer,
  setCustomer: state.setCustomer,
});

// Hook para usar apenas os valores computados (otimização)
export const usePDVComputedValues = () => {
  return usePDVStore(selectComputedValues);
};

// Hooks individuais para valores computados (mais estáveis para SSR)
export const usePDVSubtotal = () => usePDVStore(selectSubtotal);
export const usePDVDiscountAmount = () => usePDVStore(selectDiscountAmount);
export const usePDVTotal = () => usePDVStore(selectTotal);

// Hook para usar apenas o estado do carrinho
export const usePDVCart = () => {
  return usePDVStore(selectCartState);
};

// Hook para usar apenas o estado dos modais
export const usePDVModals = () => {
  return usePDVStore(selectModalsState);
};

// Hook para usar apenas o estado do cliente
export const usePDVCustomer = () => {
  return usePDVStore(selectCustomerState);
};

// Hook SSR-safe para evitar hydration mismatch
export const useHydratedPDVStore = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const store = usePDVStore();

  return hydrated
    ? store
    : {
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
      };
};
