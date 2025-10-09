"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import AddCustomerModal from "@/components/pdv/add-customer-modal";
import BudgetModal from "@/components/pdv/budget-modal";
import CartList from "@/components/pdv/cart-list";
import CustomerPanel from "@/components/pdv/customer-panel";
import DiscountModal from "@/components/pdv/discount-modal";
import PaymentMethods from "@/components/pdv/payment-methods";
import SearchCustomerModal from "@/components/pdv/search-customer-modal";
import SearchProductModal from "@/components/pdv/search-product-modal";
import TotalsPanel from "@/components/pdv/totals-panel";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/data/mock-customers";
import type { Product } from "@/data/mock-products";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import {
  usePDVComputedValues,
  usePDVModals,
  usePDVStore,
} from "@/lib/stores/pdv-store";
import { type Budget, generateBudgetId } from "@/lib/types/budget";
import { BudgetStorage } from "@/lib/utils/budget-storage";

interface MainLayoutProps {
  initialProducts?: Product[];
  initialCustomers?: Customer[];
}

export default function MainLayout({
  initialProducts = [], // TODO: Usar quando implementar camada de serviço
  initialCustomers = [], // TODO: Usar quando implementar camada de serviço
}: MainLayoutProps) {
  // Evitar warnings do TypeScript por props não usadas
  void initialProducts;
  void initialCustomers;

  // ✅ Zustand: Estado centralizado (substitui 15+ useState!)
  const {
    isSidebarOpen,
    isMobile,
    selectedCustomer,
    cartItems,
    discount,
    toggleSidebar,
    setMobile,
    setInitialized,
    addItem,
    updateQuantity,
    removeItem,
    setCustomer,
    setDiscount,
    finalizeSale,
  } = usePDVStore();

  // ✅ Valores computados otimizados com Zustand
  const { subtotal, discountAmount, total } = usePDVComputedValues();

  // ✅ Estado dos modais centralizado
  const { modals, openModal, closeModal } = usePDVModals();

  // ✅ Hook para detectar tamanho da tela (otimizado)
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setMobile(mobile);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    setInitialized(true);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [setMobile, setInitialized]);

  // ✅ Handlers simplificados (lógica no Zustand)
  const handleSearchCustomer = () => openModal("searchCustomer");
  const handleAddCustomer = () => openModal("addCustomer");
  const handleAddProduct = () => openModal("searchProduct");
  const handleAddNewCustomer = (customer: Customer) => setCustomer(customer);
  const handleSelectProduct = (product: Product) => addItem(product);
  const handleUpdateQuantity = (productId: string, quantity: number) =>
    updateQuantity(productId, quantity);
  const handleRemoveItem = (productId: string) => removeItem(productId);
  const handleSelectCustomer = (customer: Customer) => setCustomer(customer);

  const handleSelectPaymentMethod = (method: string) => {
    console.log(`Forma de pagamento selecionada: ${method}`);
  };

  const handleApplyDiscount = (type: "percentage" | "fixed", value: number) => {
    setDiscount(type, value);
  };

  const handleOpenDiscountModal = () => {
    if (cartItems.length === 0) {
      return; // Toast será mostrado pelo Zustand
    }
    openModal("discount");
  };

  const handleSaveBudget = () => {
    if (cartItems.length === 0) {
      return; // Toast será mostrado pelo Zustand
    }

    const budget: Budget = {
      id: generateBudgetId(),
      date: new Date(),
      customer: selectedCustomer,
      items: cartItems,
      discount: {
        type: discount.type,
        value: discount.value,
      },
      subtotal,
      total,
    };

    BudgetStorage.save(budget);
    // Zustand já limpa o carrinho após salvar
  };

  const handleLoadBudget = (sale: Budget) => {
    // TODO: Implementar carregamento de orçamento no Zustand
    setCustomer(sale.customer);
    BudgetStorage.remove(sale.id);
  };

  const handleOpenBudgets = () => openModal("budgets");

  // ✅ Configurar atalhos de teclado
  useKeyboardShortcuts({
    onSearchCustomer: handleSearchCustomer,
    onSearchProduct: handleAddProduct,
    onApplyDiscount: handleOpenDiscountModal,
    onFinalizeSale: finalizeSale,
  });

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header sellerName="Vendedor" onMenuToggle={toggleSidebar} />

        <main className="flex flex-1 overflow-hidden">
          {/* Left Panel - Customer and Cart */}
          <div className="flex w-full flex-col lg:w-2/3">
            {/* Customer Panel */}
            <div className="border-b p-4">
              <CustomerPanel
                customer={selectedCustomer}
                onSearchCustomer={handleSearchCustomer}
                onAddCustomer={handleAddCustomer}
              />
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-4">
              <CartList
                items={cartItems}
                onAddProduct={handleAddProduct}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            </div>
          </div>

          {/* Right Panel - Totals and Payment */}
          <div className="hidden w-1/3 flex-col border-l bg-white dark:bg-gray-800 lg:flex">
            {/* Totals Panel */}
            <div className="flex-1 p-4">
              <TotalsPanel
                subtotal={subtotal}
                discount={discountAmount}
                total={total}
                onAddDiscount={handleOpenDiscountModal}
              />

              {/* Botões de ação */}
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveBudget}
                >
                  Salvar Orçamento
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleOpenBudgets}
                >
                  Ver Orçamentos
                </Button>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-t p-4">
              <PaymentMethods
                onSelectPaymentMethod={handleSelectPaymentMethod}
              />
            </div>

            {/* Finalize Sale Button */}
            <div className="border-t p-4">
              <Button
                className="mt-auto w-full py-6 text-lg"
                onClick={finalizeSale}
                aria-label="Finalizar venda"
              >
                Finalizar Venda
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <SearchCustomerModal
        isOpen={modals.searchCustomer}
        onClose={() => closeModal("searchCustomer")}
        onSelectCustomer={handleSelectCustomer}
      />

      <AddCustomerModal
        isOpen={modals.addCustomer}
        onClose={() => closeModal("addCustomer")}
        onAddCustomer={handleAddNewCustomer}
      />

      <SearchProductModal
        isOpen={modals.searchProduct}
        onClose={() => closeModal("searchProduct")}
        onSelectProduct={handleSelectProduct}
      />

      <DiscountModal
        isOpen={modals.discount}
        onClose={() => closeModal("discount")}
        onApplyDiscount={handleApplyDiscount}
        subtotal={subtotal}
      />

      <BudgetModal
        isOpen={modals.budgets}
        onClose={() => closeModal("budgets")}
        onLoadSale={handleLoadBudget}
      />

      {/* Toast container */}
      <Toaster position="top-right" />
    </div>
  );
}
