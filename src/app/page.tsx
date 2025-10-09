import type { Metadata } from "next";
import { Suspense } from "react";
import MainLayout from "@/components/layout/main-layout";
import { mockCustomers } from "@/data/mock-customers";
import { mockProducts } from "@/data/mock-products";

export const metadata: Metadata = {
  title: "PDV - Ponto de Venda",
  description: "Interface principal do sistema de ponto de venda",
};

// Simulação de fetch de dados (preparação para API futura)
async function getInitialData() {
  // Simulando delay de API
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    products: mockProducts,
    customers: mockCustomers,
  };
}

export default async function HomePage() {
  // Em desenvolvimento, buscar dados mockados
  // Em produção, isso viria de uma API real
  const initialData = await getInitialData();

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Carregando PDV...
        </div>
      }
    >
      <MainLayout
        initialProducts={initialData.products}
        initialCustomers={initialData.customers}
      />
    </Suspense>
  );
}
