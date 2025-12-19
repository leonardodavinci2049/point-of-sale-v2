import { useCallback, useEffect, useState } from "react";

/**
 * Hook SSR-safe para usar localStorage no React
 * Evita hydration mismatch inicializando com valor padrão no servidor
 * e só carregando do localStorage após hidratação no cliente
 *
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial/padrão
 * @returns [valor, setValue, isClient] - Estado, setter e flag de cliente
 *
 * @example
 * const [theme, setTheme, isLoaded] = useLocalStorage('theme', 'light');
 *
 * // Só usar o valor após isLoaded ser true para evitar flicker
 * if (!isLoaded) return <div>Carregando...</div>;
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  // Estado inicializa sempre com valor padrão (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isClient, setIsClient] = useState(false);

  // Após hidratação, carrega valor real do localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsedValue = JSON.parse(item);
        setStoredValue(parsedValue);
      }
    } catch (error) {
      console.warn(`Erro ao carregar localStorage [${key}]:`, error);
      // Mantém o valor inicial em caso de erro
    } finally {
      setIsClient(true);
    }
  }, [key]);

  // Setter que também salva no localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Permite tanto valor direto quanto função updater
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Atualiza estado local
        setStoredValue(valueToStore);

        // Salva no localStorage (apenas no cliente)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Dispara evento customizado para sincronizar entre abas
          window.dispatchEvent(
            new CustomEvent("localStorage", {
              detail: { key, value: valueToStore },
            }),
          );
        }
      } catch (error) {
        console.error(`Erro ao salvar localStorage [${key}]:`, error);
      }
    },
    [key, storedValue],
  );

  // Sincroniza entre abas/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Erro ao sincronizar localStorage [${key}]:`, error);
        }
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    // Eventos nativos entre abas
    window.addEventListener("storage", handleStorageChange);
    // Eventos customizados na mesma aba
    window.addEventListener("localStorage", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorage",
        handleCustomEvent as EventListener,
      );
    };
  }, [key]);

  return [storedValue, setValue, isClient];
}

/**
 * Hook mais simples quando não precisamos da flag isClient
 * Usa Suspense-like pattern com valor inicial
 *
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial
 * @returns [valor, setValue] - Estado e setter
 */
export function useLocalStorageSimple<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useLocalStorage(key, initialValue);

  // Retorna apenas valor e setter, sem isClient
  return [value, setValue];
}

/**
 * Hook que suspende até carregar do localStorage
 * Útil quando precisamos garantir que o valor foi carregado
 *
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial
 * @returns [valor, setValue] - Estado e setter (apenas após carregado)
 */
export function useLocalStorageSuspense<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue, isClient] = useLocalStorage(key, initialValue);

  if (!isClient) {
    // Em ambiente real, isso seria um Suspense boundary
    throw new Promise(() => {}); // Suspende até carregar
  }

  return [value, setValue];
}

/**
 * Hook para verificar se localStorage está disponível
 * Útil para conditional rendering
 *
 * @returns boolean - true se localStorage está disponível
 */
export function useLocalStorageAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    try {
      const testKey = "__localStorage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
    }
  }, []);

  return isAvailable;
}

/**
 * Hook para clear múltiplas chaves do localStorage
 *
 * @param keys - Array de chaves para limpar
 * @returns função para executar limpeza
 */
export function useLocalStorageClear(keys: string[]) {
  return useCallback(() => {
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Erro ao limpar localStorage [${key}]:`, error);
      }
    });
  }, [keys]);
}
