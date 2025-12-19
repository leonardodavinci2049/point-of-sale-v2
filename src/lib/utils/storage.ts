/**
 * Utilitário type-safe e SSR-safe para gerenciar LocalStorage
 * Fornece funções para salvar, carregar e remover dados do navegador
 * com suporte a migração e versionamento
 */

import { createMigrationSystem, type MigrationConfig } from "./data-migration";

/**
 * Verifica se localStorage está disponível (SSR-safe)
 * @returns true se localStorage está disponível
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false; // SSR
  }

  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false; // localStorage bloqueado ou não disponível
  }
}

/**
 * Salva um valor no LocalStorage (SSR-safe)
 * @param key - Chave para armazenar o valor
 * @param value - Valor a ser armazenado (será convertido para JSON)
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) {
    console.warn(
      `localStorage não disponível, não foi possível salvar [${key}]`,
    );
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);

    // Dispara evento customizado para sincronização entre componentes
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("localStorage", {
          detail: { key, value },
        }),
      );
    }
  } catch (error) {
    console.error(`Erro ao salvar no LocalStorage (${key}):`, error);
  }
}

/**
 * Carrega um valor do LocalStorage (SSR-safe)
 * @param key - Chave do valor a ser carregado
 * @param defaultValue - Valor padrão caso a chave não exista
 * @returns O valor armazenado ou o valor padrão
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) {
    return defaultValue; // SSR ou localStorage indisponível
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Erro ao carregar do LocalStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Remove um valor do LocalStorage (SSR-safe)
 * @param key - Chave do valor a ser removido
 */
export function removeLocalStorage(key: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(key);

    // Dispara evento customizado
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("localStorage", {
          detail: { key, value: null },
        }),
      );
    }
  } catch (error) {
    console.error(`Erro ao remover do LocalStorage (${key}):`, error);
  }
}

/**
 * Limpa todo o LocalStorage (SSR-safe)
 */
export function clearLocalStorage(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.clear();
  } catch (error) {
    console.error("Erro ao limpar LocalStorage:", error);
  }
}

/**
 * Verifica se uma chave existe no LocalStorage (SSR-safe)
 * @param key - Chave a ser verificada
 * @returns true se a chave existe, false caso contrário
 */
export function hasLocalStorage(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Carrega dados com sistema de migração automática
 * @param key - Chave do localStorage
 * @param config - Configuração de migração
 * @returns Dados migrados para versão atual
 */
export function getLocalStorageWithMigration<T>(
  key: string,
  config: MigrationConfig<T>,
): T {
  if (!isLocalStorageAvailable()) {
    return config.defaultData;
  }

  const migrationSystem = createMigrationSystem(config);
  const versionedData = migrationSystem.loadData(key);

  // Salva dados migrados de volta no localStorage
  migrationSystem.saveData(key, versionedData.data);

  return versionedData.data;
}

/**
 * Salva dados com versionamento automático
 * @param key - Chave do localStorage
 * @param data - Dados a serem salvos
 * @param version - Versão atual dos dados
 */
export function setLocalStorageVersioned<T>(
  key: string,
  data: T,
  version: number,
): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  const config: MigrationConfig<T> = {
    currentVersion: version,
    migrations: [],
    defaultData: data,
  };

  const migrationSystem = createMigrationSystem(config);
  migrationSystem.saveData(key, data);
}

/**
 * Cria backup dos dados antes de operações destrutivas
 * @param key - Chave do localStorage
 * @returns Chave do backup criado ou null se falhou
 */
export function backupLocalStorage(key: string): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  const config: MigrationConfig<unknown> = {
    currentVersion: 1,
    migrations: [],
    defaultData: null,
  };

  const migrationSystem = createMigrationSystem(config);
  return migrationSystem.backupData(key);
}

/**
 * Lista todos os backups disponíveis para uma chave
 * @param key - Chave original
 * @returns Array com chaves de backup
 */
export function listLocalStorageBackups(key: string): string[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  const config: MigrationConfig<unknown> = {
    currentVersion: 1,
    migrations: [],
    defaultData: null,
  };

  const migrationSystem = createMigrationSystem(config);
  return migrationSystem.listBackups(key);
}

/**
 * Limpa backups antigos, mantendo apenas os N mais recentes
 * @param key - Chave original
 * @param keepCount - Número de backups a manter (padrão: 5)
 */
export function cleanupLocalStorageBackups(key: string, keepCount = 5): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  const config: MigrationConfig<unknown> = {
    currentVersion: 1,
    migrations: [],
    defaultData: null,
  };

  const migrationSystem = createMigrationSystem(config);
  migrationSystem.cleanupBackups(key, keepCount);
}

/**
 * Obtém informações sobre o uso do localStorage
 * @returns Objeto com estatísticas de uso
 */
export function getLocalStorageStats() {
  if (!isLocalStorageAvailable()) {
    return {
      totalKeys: 0,
      totalSize: 0,
      availableSpace: 0,
      isNearLimit: false,
    };
  }

  let totalSize = 0;
  let totalKeys = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      totalKeys++;
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  }

  // Estima espaço disponível (a maioria dos browsers tem limite de ~5MB)
  const estimatedLimit = 5 * 1024 * 1024; // 5MB em bytes
  const availableSpace = estimatedLimit - totalSize;
  const isNearLimit = totalSize > estimatedLimit * 0.8; // 80% do limite

  return {
    totalKeys,
    totalSize,
    availableSpace,
    isNearLimit,
    usage: `${(totalSize / 1024).toFixed(2)} KB`,
  };
}

// Mantido para compatibilidade com código existente
// @deprecated Use as funções individuais ao invés da classe
export const LocalStorageManager = {
  set: setLocalStorage,
  get: getLocalStorage,
  remove: removeLocalStorage,
  clear: clearLocalStorage,
  has: hasLocalStorage,
} as const;

/**
 * Chaves do LocalStorage usadas no sistema PDV
 */
export const STORAGE_KEYS = {
  CART: "pdv:cart",
  CUSTOMER: "pdv:customer",
  DISCOUNT: "pdv:discount",
  BUDGETS: "pdv:budgets",
  PENDING_SALES: "pdv:pending-sales",
  THEME: "pdv:theme",
  LAST_SALE: "pdv:last-sale",
} as const;
