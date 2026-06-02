/**
 * DatabaseProvider component for GG-Economy Mobile
 *
 * This component handles database initialization and provides
 * database context to the app. It shows a loading state while
 * migrations are running.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase, MigrationError } from './migrate';
import { getDb, Database } from './client';

// ============================================================================
// Types
// ============================================================================

interface DatabaseContextValue {
  /** The Drizzle database client */
  db: Database;
  /** Whether the database is ready for use */
  isReady: boolean;
  /** Any error that occurred during initialization */
  error: Error | null;
  /** Retry initialization after an error */
  retry: () => void;
}

interface DatabaseProviderProps {
  /** Child components to render when database is ready */
  children: ReactNode;
  /** Custom loading component */
  LoadingComponent?: React.ComponentType;
  /** Custom error component */
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
}

// ============================================================================
// Context
// ============================================================================

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ============================================================================
// Default Components
// ============================================================================

function DefaultLoadingComponent() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Initializing database...</Text>
    </View>
  );
}

function DefaultErrorComponent({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Database Error</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Text style={styles.retryButton} onPress={retry}>
        Tap to retry
      </Text>
    </View>
  );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * DatabaseProvider component
 *
 * Wraps the app and provides database context after initialization.
 * Shows loading state during migration and error state if initialization fails.
 */
export function DatabaseProvider({
  children,
  LoadingComponent = DefaultLoadingComponent,
  ErrorComponent = DefaultErrorComponent,
}: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      await initializeDatabase();

      // Generate recurring occurrences for the next 12 months on startup
      // This ensures future months always have projected data
      try {
        const { occurrenceGenerator } =
          await import('../services/weekly-recurring/OccurrenceGenerator');
        const { generateMonthlyTransactions } =
          await import('../services/recurring/RecurringTransactionService');
        const now = new Date();
        for (let i = 0; i < 12; i++) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
          await occurrenceGenerator.generateForMonth(targetMonth);
          await generateMonthlyTransactions(targetMonth);
        }
      } catch (genError) {
        // Non-fatal: log but don't block app startup
        console.warn('[DatabaseProvider] Failed to generate future occurrences:', genError);
      }

      setIsReady(true);
    } catch (err) {
      console.error('[DatabaseProvider] Initialization failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsReady(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize, retryCount]);

  // Show loading state
  if (!isReady && !error) {
    return <LoadingComponent />;
  }

  // Show error state
  if (error) {
    return <ErrorComponent error={error} retry={retry} />;
  }

  // Provide database context
  const contextValue: DatabaseContextValue = {
    db: getDb(),
    isReady,
    error,
    retry,
  };

  return <DatabaseContext.Provider value={contextValue}>{children}</DatabaseContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the database context
 *
 * @returns The database context value
 * @throws If used outside of DatabaseProvider
 */
export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }

  return context;
}

/**
 * Hook to access just the database client
 *
 * @returns The Drizzle database client
 * @throws If used outside of DatabaseProvider
 */
export function useDrizzle(): Database {
  const { db } = useDatabase();
  return db;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

// ============================================================================
// Exports
// ============================================================================

export { MigrationError };
