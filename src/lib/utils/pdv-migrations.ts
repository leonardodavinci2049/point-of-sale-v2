/**
 * Sistema de migração específico para o PDV Store
 * Define migrações entre versões dos dados do Zustand store
 */

import type { Customer } from "@/data/mock-customers";
import type { OrderItem } from "@/lib/types/order";
import { createMigration, type Migration } from "./data-migration";

/**
 * Interface para versão 0 (dados legados sem versionamento)
 */
interface PDVDataV0 {
  cartItems?: OrderItem[];
  selectedCustomer?: Customer | null;
  discount?: {
    type?: "percentage" | "fixed" | null;
    value?: number;
  };
}

/**
 * Interface para versão 1 (primeira versão versionada)
 */
export interface PDVDataV1 {
  cartItems: OrderItem[];
  selectedCustomer: Customer | null;
  discount: {
    type: "percentage" | "fixed" | null;
    value: number;
  };
  metadata?: {
    lastUpdated: string;
    totalSales: number;
  };
}

/**
 * Interface para versão 2 (versão futura com campos adicionais)
 */
export interface PDVDataV2 extends PDVDataV1 {
  settings: {
    autoSave: boolean;
    theme: "light" | "dark" | "system";
    language: string;
  };
  recentCustomers: Customer[];
  quickActions: string[];
}

/**
 * Dados padrão para inicialização
 */
export const DEFAULT_PDV_DATA: PDVDataV1 = {
  cartItems: [],
  selectedCustomer: null,
  discount: {
    type: null,
    value: 0,
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    totalSales: 0,
  },
};

/**
 * Validador para dados V1
 */
export function validatePDVDataV1(data: unknown): data is PDVDataV1 {
  if (!data || typeof data !== "object") {
    return false;
  }

  const d = data as Record<string, unknown>;

  // Verifica campos obrigatórios
  if (!Array.isArray(d.cartItems)) {
    return false;
  }

  if (
    d.selectedCustomer !== null &&
    (typeof d.selectedCustomer !== "object" || !d.selectedCustomer)
  ) {
    return false;
  }

  if (!d.discount || typeof d.discount !== "object") {
    return false;
  }

  const discount = d.discount as Record<string, unknown>;
  if (
    (discount.type !== null && typeof discount.type !== "string") ||
    (discount.type &&
      !["percentage", "fixed"].includes(discount.type as string))
  ) {
    return false;
  }

  if (typeof discount.value !== "number") {
    return false;
  }

  return true;
}

/**
 * Migração da versão 0 (legacy) para versão 1
 */
const migrationV0toV1 = createMigration<PDVDataV0, PDVDataV1>(
  0,
  1,
  "Migração de dados legados para estrutura versionada",
  (data: PDVDataV0): PDVDataV1 => {
    return {
      cartItems: data.cartItems || [],
      selectedCustomer: data.selectedCustomer || null,
      discount: {
        type: data.discount?.type || null,
        value: data.discount?.value || 0,
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalSales: 0,
      },
    };
  },
);

/**
 * Migração da versão 1 para versão 2 (futura)
 */
const migrationV1toV2 = createMigration<PDVDataV1, PDVDataV2>(
  1,
  2,
  "Adição de configurações e histórico de clientes recentes",
  (data: PDVDataV1): PDVDataV2 => {
    return {
      ...data,
      settings: {
        autoSave: true,
        theme: "system",
        language: "pt-BR",
      },
      recentCustomers: data.selectedCustomer ? [data.selectedCustomer] : [],
      quickActions: ["F2", "F3", "F4", "F5"],
    };
  },
);

/**
 * Lista de todas as migrações disponíveis
 */
export const PDV_MIGRATIONS: Migration<unknown, unknown>[] = [
  migrationV0toV1 as Migration<unknown, unknown>,
  migrationV1toV2 as Migration<unknown, unknown>,
];

/**
 * Versão atual dos dados do PDV
 */
export const CURRENT_PDV_VERSION = 1;

/**
 * Função para sanitizar items do carrinho
 * Garante que todos os items tenham as propriedades obrigatórias
 */
export function sanitizeCartItems(items: unknown[]): OrderItem[] {
  return items
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item): OrderItem => ({
        productId:
          typeof item.productId === "string" ? item.productId : "unknown",
        name:
          typeof item.name === "string" ? item.name : "Produto desconhecido",
        image: typeof item.image === "string" ? item.image : "/placeholder.jpg",
        quantity:
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1,
        unitPrice:
          typeof item.unitPrice === "number" && item.unitPrice >= 0
            ? item.unitPrice
            : 0,
        subtotal:
          typeof item.subtotal === "number" && item.subtotal >= 0
            ? item.subtotal
            : 0,
        variant:
          item.variant && typeof item.variant === "object"
            ? (item.variant as OrderItem["variant"])
            : undefined,
      }),
    )
    .filter((item) => item.productId !== "unknown"); // Remove items inválidos
}

/**
 * Função para sanitizar dados do cliente
 */
export function sanitizeCustomer(customer: unknown): Customer | null {
  if (!customer || typeof customer !== "object") {
    return null;
  }

  const c = customer as Record<string, unknown>;

  // Verifica campos obrigatórios
  if (
    typeof c.id !== "string" ||
    typeof c.name !== "string" ||
    typeof c.phone !== "string"
  ) {
    return null;
  }

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: typeof c.email === "string" ? c.email : undefined,
    cpf_cnpj: typeof c.cpf_cnpj === "string" ? c.cpf_cnpj : undefined,
    type: c.type === "business" ? "business" : "individual",
    address:
      c.address && typeof c.address === "object"
        ? (c.address as Customer["address"])
        : undefined,
    avatar: typeof c.avatar === "string" ? c.avatar : "/placeholder-avatar.jpg",
    createdAt:
      typeof c.createdAt === "string" ? new Date(c.createdAt) : new Date(),
  };
}

/**
 * Função para sanitizar dados de desconto
 */
export function sanitizeDiscount(discount: unknown): PDVDataV1["discount"] {
  if (!discount || typeof discount !== "object") {
    return { type: null, value: 0 };
  }

  const d = discount as Record<string, unknown>;

  const type = d.type === "percentage" || d.type === "fixed" ? d.type : null;
  const value = typeof d.value === "number" && d.value >= 0 ? d.value : 0;

  return { type, value };
}
