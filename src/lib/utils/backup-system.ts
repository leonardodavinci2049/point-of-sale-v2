/**
 * Sistema de backup e recuperação de dados para localStorage
 * Fornece funcionalidades robustas para proteger dados críticos do PDV
 */

import {
  getLocalStorage,
  isLocalStorageAvailable,
  setLocalStorage,
} from "./storage";

/**
 * Interface para configuração de backup
 */
export interface BackupConfig {
  /** Chaves que devem ser incluídas no backup */
  keys: string[];
  /** Nome do backup (será usado como prefixo) */
  name: string;
  /** Máximo de backups a manter */
  maxBackups?: number;
  /** Incluir timestamp no nome do backup */
  includeTimestamp?: boolean;
  /** Compactar dados do backup (remove espaços do JSON) */
  compress?: boolean;
}

/**
 * Interface para metadados do backup
 */
export interface BackupMetadata {
  /** Timestamp de criação */
  createdAt: string;
  /** Versão do sistema no momento do backup */
  version: string;
  /** Número de chaves incluídas */
  keyCount: number;
  /** Tamanho total dos dados em bytes */
  size: number;
  /** Hash dos dados para verificação de integridade */
  checksum: string;
  /** Descrição do backup */
  description?: string;
}

/**
 * Interface para dados de backup
 */
export interface BackupData {
  /** Metadados do backup */
  metadata: BackupMetadata;
  /** Dados das chaves */
  data: Record<string, unknown>;
}

/**
 * Constantes para o sistema de backup
 */
const BACKUP_PREFIX = "pdv_backup_";
const METADATA_SUFFIX = "_metadata";

/**
 * Gera hash simples dos dados para verificação de integridade
 */
function generateChecksum(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Converte para 32bit
  }

  return Math.abs(hash).toString(16);
}

/**
 * Cria um backup completo das chaves especificadas
 */
export function createBackup(
  config: BackupConfig,
  description?: string,
): string | null {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage não disponível para backup");
    return null;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName =
      config.includeTimestamp !== false
        ? `${config.name}_${timestamp}`
        : config.name;

    const backupKey = `${BACKUP_PREFIX}${backupName}`;

    // Coleta dados das chaves especificadas
    const data: Record<string, unknown> = {};
    let totalSize = 0;

    for (const key of config.keys) {
      const value = getLocalStorage(key, null);
      if (value !== null) {
        data[key] = value;
        totalSize += JSON.stringify(value).length;
      }
    }

    // Cria metadados
    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      version: "1.0.0", // Poderia vir do package.json
      keyCount: Object.keys(data).length,
      size: totalSize,
      checksum: generateChecksum(data),
      description,
    };

    // Salva backup
    const backupData: BackupData = { metadata, data };
    setLocalStorage(backupKey, backupData);

    // Salva metadados separadamente para consulta rápida
    setLocalStorage(`${backupKey}${METADATA_SUFFIX}`, metadata);

    // Limpa backups antigos se especificado
    if (config.maxBackups && config.maxBackups > 0) {
      cleanupOldBackups(config.name, config.maxBackups);
    }

    console.log(`Backup criado: ${backupKey}`);
    return backupKey;
  } catch (error) {
    console.error("Erro ao criar backup:", error);
    return null;
  }
}

/**
 * Lista todos os backups disponíveis
 */
export function listBackups(
  name?: string,
): Array<{ key: string; metadata: BackupMetadata }> {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  const backups: Array<{ key: string; metadata: BackupMetadata }> = [];
  const prefix = name ? `${BACKUP_PREFIX}${name}` : BACKUP_PREFIX;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(prefix) && key.endsWith(METADATA_SUFFIX)) {
        const backupKey = key.replace(METADATA_SUFFIX, "");
        const metadata = getLocalStorage<BackupMetadata | null>(key, null);

        if (metadata) {
          backups.push({ key: backupKey, metadata });
        }
      }
    }

    // Ordena por data de criação (mais recente primeiro)
    return backups.sort(
      (a, b) =>
        new Date(b.metadata.createdAt).getTime() -
        new Date(a.metadata.createdAt).getTime(),
    );
  } catch (error) {
    console.error("Erro ao listar backups:", error);
    return [];
  }
}

/**
 * Restaura dados de um backup
 */
export function restoreBackup(
  backupKey: string,
  options?: {
    /** Verificar integridade antes de restaurar */
    verifyIntegrity?: boolean;
    /** Chaves específicas para restaurar (se não informado, restaura todas) */
    specificKeys?: string[];
    /** Criar backup atual antes de restaurar */
    createBackupBefore?: boolean;
  },
): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage não disponível para restauração");
    return false;
  }

  try {
    const backupData = getLocalStorage<BackupData | null>(backupKey, null);

    if (!backupData) {
      console.error(`Backup não encontrado: ${backupKey}`);
      return false;
    }

    // Verifica integridade se solicitado
    if (options?.verifyIntegrity) {
      const currentChecksum = generateChecksum(backupData.data);
      if (currentChecksum !== backupData.metadata.checksum) {
        console.error("Backup corrompido - checksum não confere");
        return false;
      }
    }

    // Cria backup atual antes de restaurar se solicitado
    if (options?.createBackupBefore) {
      const keys = options.specificKeys || Object.keys(backupData.data);
      createBackup(
        {
          keys,
          name: "before_restore",
          maxBackups: 3,
        },
        `Backup automático antes de restaurar ${backupKey}`,
      );
    }

    // Restaura dados
    const keysToRestore = options?.specificKeys || Object.keys(backupData.data);
    let restoredCount = 0;

    for (const key of keysToRestore) {
      if (key in backupData.data) {
        setLocalStorage(key, backupData.data[key]);
        restoredCount++;
      }
    }

    console.log(`Backup restaurado: ${restoredCount} chaves de ${backupKey}`);
    return true;
  } catch (error) {
    console.error("Erro ao restaurar backup:", error);
    return false;
  }
}

/**
 * Remove um backup específico
 */
export function deleteBackup(backupKey: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    // Remove dados do backup
    localStorage.removeItem(backupKey);

    // Remove metadados
    localStorage.removeItem(`${backupKey}${METADATA_SUFFIX}`);

    console.log(`Backup removido: ${backupKey}`);
    return true;
  } catch (error) {
    console.error("Erro ao remover backup:", error);
    return false;
  }
}

/**
 * Valida integridade de um backup
 */
export function validateBackup(backupKey: string): boolean {
  try {
    const backupData = getLocalStorage<BackupData | null>(backupKey, null);

    if (!backupData) {
      return false;
    }

    // Verifica estrutura
    if (!backupData.metadata || !backupData.data) {
      return false;
    }

    // Verifica checksum
    const currentChecksum = generateChecksum(backupData.data);
    return currentChecksum === backupData.metadata.checksum;
  } catch {
    return false;
  }
}

/**
 * Limpa backups antigos mantendo apenas os N mais recentes
 */
function cleanupOldBackups(name: string, maxBackups: number): void {
  const backups = listBackups(name);

  if (backups.length > maxBackups) {
    const toDelete = backups.slice(maxBackups);

    for (const backup of toDelete) {
      deleteBackup(backup.key);
    }

    console.log(`Removidos ${toDelete.length} backups antigos de "${name}"`);
  }
}

/**
 * Funções convenientes para backup do PDV
 */
export const PDVBackup = {
  /**
   * Cria backup completo do PDV
   */
  createFullBackup: (description?: string) => {
    return createBackup(
      {
        keys: [
          "pdv-storage", // Zustand store
          "pdv:budgets",
          "pdv:pending-sales",
          "pdv:theme",
          "pdv:last-sale",
        ],
        name: "pdv_full",
        maxBackups: 10,
        includeTimestamp: true,
      },
      description,
    );
  },

  /**
   * Cria backup apenas do carrinho atual
   */
  createCartBackup: (description?: string) => {
    return createBackup(
      {
        keys: ["pdv-storage"],
        name: "pdv_cart",
        maxBackups: 5,
        includeTimestamp: true,
      },
      description,
    );
  },

  /**
   * Lista todos os backups do PDV
   */
  listAllBackups: () => {
    return listBackups("pdv_");
  },

  /**
   * Restaura backup completo do PDV
   */
  restoreFullBackup: (backupKey: string) => {
    return restoreBackup(backupKey, {
      verifyIntegrity: true,
      createBackupBefore: true,
    });
  },
};
