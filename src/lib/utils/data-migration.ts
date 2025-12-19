/**
 * Sistema robusto de migração e versionamento para localStorage
 * Permite evolução segura da estrutura de dados ao longo do tempo
 */

/**
 * Interface para definir uma migração
 */
export interface Migration<TFrom = unknown, TTo = unknown> {
  /** Versão de origem */
  fromVersion: number;
  /** Versão de destino */
  toVersion: number;
  /** Função que executa a migração */
  migrate: (data: TFrom) => TTo;
  /** Descrição da migração para debug */
  description: string;
}

/**
 * Interface para dados versionados
 */
export interface VersionedData<T = unknown> {
  /** Versão atual dos dados */
  version: number;
  /** Os dados propriamente ditos */
  data: T;
  /** Timestamp de criação */
  createdAt?: string;
  /** Timestamp da última atualização */
  updatedAt?: string;
}

/**
 * Interface para configuração do sistema de migração
 */
export interface MigrationConfig<T> {
  /** Versão atual dos dados */
  currentVersion: number;
  /** Lista de migrações disponíveis */
  migrations: Migration[];
  /** Dados padrão para inicialização */
  defaultData: T;
  /** Validação dos dados (opcional) */
  validate?: (data: unknown) => data is T;
  /** Callback para backup antes da migração */
  onBeforeMigration?: (data: VersionedData) => void;
  /** Callback após migração bem-sucedida */
  onAfterMigration?: (data: VersionedData<T>) => void;
  /** Callback em caso de erro na migração */
  onMigrationError?: (error: Error, data: VersionedData) => void;
}

/**
 * Classe principal para gerenciar migrações
 */
export class DataMigrationManager<T> {
  private config: MigrationConfig<T>;

  constructor(config: MigrationConfig<T>) {
    this.config = config;
  }

  /**
   * Carrega dados do localStorage com migração automática
   */
  loadData(key: string): VersionedData<T> {
    try {
      const rawData = this.getRawData(key);

      if (!rawData) {
        return this.createInitialData();
      }

      // Se dados não estão versionados, assume versão 0
      if (!this.isVersionedData(rawData)) {
        return this.migrateFromLegacy(rawData);
      }

      return this.migrateToCurrentVersion(rawData);
    } catch (error) {
      console.error(`Erro ao carregar dados [${key}]:`, error);
      return this.createInitialData();
    }
  }

  /**
   * Salva dados no localStorage com versionamento
   */
  saveData(key: string, data: T): void {
    try {
      const versionedData: VersionedData<T> = {
        version: this.config.currentVersion,
        data,
        createdAt: this.getExistingCreatedAt(key),
        updatedAt: new Date().toISOString(),
      };

      const serialized = JSON.stringify(versionedData);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Erro ao salvar dados [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Executa backup dos dados antes de operações destrutivas
   */
  backupData(key: string): string | null {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      const backupKey = `${key}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, data);

      return backupKey;
    } catch (error) {
      console.error(`Erro ao fazer backup [${key}]:`, error);
      return null;
    }
  }

  /**
   * Restaura dados de um backup
   */
  restoreFromBackup(key: string, backupKey: string): boolean {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) return false;

      localStorage.setItem(key, backupData);
      return true;
    } catch (error) {
      console.error(`Erro ao restaurar backup [${backupKey}]:`, error);
      return false;
    }
  }

  /**
   * Lista todos os backups disponíveis para uma chave
   */
  listBackups(key: string): string[] {
    const backups: string[] = [];
    const prefix = `${key}_backup_`;

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(prefix)) {
        backups.push(storageKey);
      }
    }

    return backups.sort().reverse(); // Mais recente primeiro
  }

  /**
   * Remove backups antigos (mantém apenas os N mais recentes)
   */
  cleanupBackups(key: string, keepCount = 5): void {
    const backups = this.listBackups(key);
    const toRemove = backups.slice(keepCount);

    toRemove.forEach((backupKey) => {
      try {
        localStorage.removeItem(backupKey);
      } catch (error) {
        console.warn(`Erro ao remover backup [${backupKey}]:`, error);
      }
    });
  }

  // Métodos privados

  private getRawData(key: string): unknown {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private isVersionedData(data: unknown): data is VersionedData {
    return (
      typeof data === "object" &&
      data !== null &&
      "version" in data &&
      "data" in data &&
      typeof (data as Record<string, unknown>).version === "number"
    );
  }

  private createInitialData(): VersionedData<T> {
    const now = new Date().toISOString();
    return {
      version: this.config.currentVersion,
      data: this.config.defaultData,
      createdAt: now,
      updatedAt: now,
    };
  }

  private migrateFromLegacy(rawData: unknown): VersionedData<T> {
    // Tenta migrar dados legados (sem versão) para versão atual
    let migratedData = rawData;

    // Executa todas as migrações sequencialmente a partir da versão 0
    const migrations = this.config.migrations
      .filter((m) => m.fromVersion === 0)
      .sort((a, b) => a.toVersion - b.toVersion);

    for (const migration of migrations) {
      try {
        migratedData = migration.migrate(migratedData);
      } catch (error) {
        console.error(
          `Erro na migração legacy ${migration.description}:`,
          error,
        );
        return this.createInitialData();
      }
    }

    const now = new Date().toISOString();
    return {
      version: this.config.currentVersion,
      data: migratedData as T,
      createdAt: now,
      updatedAt: now,
    };
  }

  private migrateToCurrentVersion(
    versionedData: VersionedData,
  ): VersionedData<T> {
    if (versionedData.version === this.config.currentVersion) {
      return versionedData as VersionedData<T>;
    }

    if (versionedData.version > this.config.currentVersion) {
      console.warn(
        `Dados têm versão ${versionedData.version} maior que a atual ${this.config.currentVersion}. ` +
          "Usando dados como estão.",
      );
      return versionedData as VersionedData<T>;
    }

    // Backup antes da migração
    this.config.onBeforeMigration?.(versionedData);

    try {
      let currentData = versionedData.data;
      let currentVersion = versionedData.version;

      // Encontra e executa migrações necessárias
      while (currentVersion < this.config.currentVersion) {
        const migration = this.config.migrations.find(
          (m) => m.fromVersion === currentVersion,
        );

        if (!migration) {
          throw new Error(
            `Migração não encontrada da versão ${currentVersion} para ${this.config.currentVersion}`,
          );
        }

        console.log(`Executando migração: ${migration.description}`);
        currentData = migration.migrate(currentData);
        currentVersion = migration.toVersion;
      }

      const migratedVersionedData: VersionedData<T> = {
        version: this.config.currentVersion,
        data: currentData as T,
        createdAt: versionedData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Valida dados migrados se validador estiver configurado
      if (
        this.config.validate &&
        !this.config.validate(migratedVersionedData.data)
      ) {
        throw new Error("Dados migrados não passaram na validação");
      }

      this.config.onAfterMigration?.(migratedVersionedData);
      return migratedVersionedData;
    } catch (error) {
      console.error("Erro durante migração:", error);
      this.config.onMigrationError?.(error as Error, versionedData);

      // Em caso de erro, retorna dados iniciais
      return this.createInitialData();
    }
  }

  private getExistingCreatedAt(key: string): string {
    try {
      const existing = this.getRawData(key);
      if (this.isVersionedData(existing) && existing.createdAt) {
        return existing.createdAt;
      }
    } catch {
      // Ignora erros
    }
    return new Date().toISOString();
  }
}

/**
 * Factory function para criar um sistema de migração
 */
export function createMigrationSystem<T>(config: MigrationConfig<T>) {
  return new DataMigrationManager<T>(config);
}

/**
 * Função helper para criar migrações
 */
export function createMigration<TFrom, TTo>(
  fromVersion: number,
  toVersion: number,
  description: string,
  migrate: (data: TFrom) => TTo,
): Migration<TFrom, TTo> {
  return {
    fromVersion,
    toVersion,
    description,
    migrate,
  };
}
