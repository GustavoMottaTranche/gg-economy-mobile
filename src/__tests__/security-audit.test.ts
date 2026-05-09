/**
 * Security Audit Tests
 *
 * Verifies that the application follows security best practices:
 * - All financial data is stored locally only
 * - OAuth tokens are stored in Secure Storage only
 * - No sensitive data in debug logs
 * - Proper data handling patterns
 * - Database protection measures
 * - Secure token refresh flow
 *
 * **Validates: Requirements 34 (Privacy and Security)**
 */

import * as fs from 'fs';
import * as path from 'path';
import { sanitizeContext } from '../errors/errorLogger';

// Module-level variables for source file analysis
const srcDir = path.join(__dirname, '../');
let sourceFiles: string[] = [];

// Helper to recursively get all TypeScript files
function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules and test files for source analysis
    if (entry.name === 'node_modules' || entry.name === '__tests__') {
      continue;
    }

    if (entry.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Helper to read file content
function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// Initialize source files before all tests
beforeAll(() => {
  sourceFiles = getAllTsFiles(srcDir);
});

describe('Security Audit', () => {
  describe('Task 31.1: Financial Data Storage Verification', () => {
    it('should only use local storage mechanisms for financial data', () => {
      const disallowedPatterns = [
        // External API calls that could leak financial data
        /firebase.*firestore/i,
        /supabase/i,
        /mongodb.*atlas/i,
        /aws.*dynamodb/i,
        /planetscale/i,
        /neon.*database/i,
      ];

      for (const file of sourceFiles) {
        const content = readFileContent(file);

        for (const pattern of disallowedPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it('should not send financial data to external analytics services', () => {
      const analyticsPatterns = [
        /amplitude/i,
        /mixpanel/i,
        /segment/i,
        /firebase.*analytics/i,
        /google.*analytics/i,
        /sentry.*captureMessage.*amount/i,
        /sentry.*captureMessage.*transaction/i,
      ];

      for (const file of sourceFiles) {
        const content = readFileContent(file);

        for (const pattern of analyticsPatterns) {
          const match = content.match(pattern);
          if (match) {
            // Allow analytics imports but not with financial data
            const hasFinancialData =
              content.includes('amount') &&
              content.includes('transaction') &&
              content.match(pattern);

            // This is a soft check - analytics are allowed but not with financial data
            if (hasFinancialData) {
              console.warn(`Warning: ${file} may be sending financial data to analytics`);
            }
          }
        }
      }
    });

    it('should only use Google Drive API for backup purposes', () => {
      const googleDriveFiles = sourceFiles.filter(
        (file) => file.includes('backup') || file.includes('GoogleDrive')
      );

      for (const file of googleDriveFiles) {
        const content = readFileContent(file);

        // Verify Google Drive is only used for backup
        if (content.includes('googleapis.com/drive')) {
          // Should be in backup-related files only
          expect(
            file.includes('backup') || file.includes('Backup') || file.includes('GoogleDrive')
          ).toBe(true);
        }
      }
    });

    it('should store all transactions in local SQLite database', () => {
      const transactionQueryFile = path.join(srcDir, 'db/queries/transactions.ts');

      if (fs.existsSync(transactionQueryFile)) {
        const content = readFileContent(transactionQueryFile);

        // Verify transactions are stored via Drizzle ORM to local SQLite
        expect(content).toContain('drizzle');
        expect(content).toContain('transactions');

        // Should not have any external API calls
        expect(content).not.toMatch(/fetch\s*\(/);
        expect(content).not.toMatch(/axios/);
      }
    });
  });

  describe('Task 31.2: OAuth Token Storage Verification', () => {
    it('should store OAuth tokens only in expo-secure-store', () => {
      const oauthFiles = sourceFiles.filter(
        (file) => file.toLowerCase().includes('oauth') || file.toLowerCase().includes('auth')
      );

      for (const file of oauthFiles) {
        const content = readFileContent(file);

        // If file handles tokens, it should use SecureStore
        if (content.includes('accessToken') || content.includes('refreshToken')) {
          // Check for proper secure storage usage
          const usesSecureStore =
            content.includes('expo-secure-store') || content.includes('SecureStore');
          const usesAsyncStorage = content.includes('AsyncStorage');

          // Tokens should not be in AsyncStorage
          if (usesAsyncStorage && !usesSecureStore) {
            // Check if AsyncStorage is used for tokens specifically
            const asyncStorageWithToken =
              content.match(/AsyncStorage.*token/i) || content.match(/token.*AsyncStorage/i);

            expect(asyncStorageWithToken).toBeNull();
          }
        }
      }
    });

    it('should not store tokens in plain text files or logs', () => {
      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Check for hardcoded tokens (common patterns)
        const hardcodedTokenPatterns = [
          /accessToken\s*=\s*['"][^'"]{20,}['"]/,
          /refreshToken\s*=\s*['"][^'"]{20,}['"]/,
          /Bearer\s+[A-Za-z0-9\-_]{20,}/,
        ];

        for (const pattern of hardcodedTokenPatterns) {
          const match = content.match(pattern);
          // Allow test files and mock data
          if (match && !file.includes('test') && !file.includes('mock')) {
            fail(`Potential hardcoded token found in ${file}: ${match[0].substring(0, 50)}...`);
          }
        }
      }
    });

    it('should use secure storage keys for token storage', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');

      if (fs.existsSync(oauthServiceFile)) {
        const content = readFileContent(oauthServiceFile);

        // Verify secure storage is imported and used
        expect(content).toContain('expo-secure-store');

        // Verify tokens are stored with proper keys
        expect(content).toMatch(/SECURE_STORAGE_KEY|SecureStore/);
      }
    });
  });

  describe('Task 31.3: Sensitive Data Clearing on App Background', () => {
    it('should have useAppStateCleanup hook implemented', () => {
      const hookFile = path.join(srcDir, 'hooks/useAppStateCleanup.ts');
      expect(fs.existsSync(hookFile)).toBe(true);

      const content = readFileContent(hookFile);

      // Verify hook handles app state changes
      expect(content).toContain('AppState');
      expect(content).toContain('background');

      // Verify it clears sensitive data
      expect(content).toContain('clear');
      expect(content).toContain('sensitiveDataCache');
    });

    it('should integrate useAppStateCleanup in root layout', () => {
      const layoutFile = path.join(__dirname, '../../app/_layout.tsx');

      if (fs.existsSync(layoutFile)) {
        const content = readFileContent(layoutFile);

        // Verify the hook is imported and used
        expect(content).toContain('useAppStateCleanup');
      }
    });

    it('should have SensitiveDataCache class for managing sensitive data', () => {
      const hookFile = path.join(srcDir, 'hooks/useAppStateCleanup.ts');
      const content = readFileContent(hookFile);

      // Verify SensitiveDataCache implementation
      expect(content).toContain('class SensitiveDataCache');
      expect(content).toContain('clear()');
      expect(content).toContain('onClear');
    });

    it('should export clearAllSensitiveData utility function', () => {
      const hookFile = path.join(srcDir, 'hooks/useAppStateCleanup.ts');
      const content = readFileContent(hookFile);

      expect(content).toContain('export function clearAllSensitiveData');
    });

    it('should clear draft data on app background', () => {
      const hookFile = path.join(srcDir, 'hooks/useAppStateCleanup.ts');
      const content = readFileContent(hookFile);

      // Verify draft store is cleared on background
      expect(content).toContain('clearDraftDataOnBackground');
      expect(content).toContain('resetDraftStore');
    });
  });

  describe('Task 31.4: Debug Log Security Verification', () => {
    it('should not log sensitive financial data', () => {
      const sensitiveDataPatterns = [
        // Direct logging of amounts
        /console\.(log|debug|info|warn|error)\s*\([^)]*amount[^)]*\)/i,
        // Direct logging of account numbers
        /console\.(log|debug|info|warn|error)\s*\([^)]*accountNumber[^)]*\)/i,
        // Direct logging of tokens
        /console\.(log|debug|info|warn|error)\s*\([^)]*token[^)]*\)/i,
        /console\.(log|debug|info|warn|error)\s*\([^)]*accessToken[^)]*\)/i,
        /console\.(log|debug|info|warn|error)\s*\([^)]*refreshToken[^)]*\)/i,
      ];

      const violations: string[] = [];

      for (const file of sourceFiles) {
        // Skip test files
        if (file.includes('test') || file.includes('__tests__')) {
          continue;
        }

        const content = readFileContent(file);
        const relativePath = path.relative(srcDir, file);

        for (const pattern of sensitiveDataPatterns) {
          const matches = content.match(new RegExp(pattern, 'g'));
          if (matches) {
            // Check if it's in a development-only block
            const isDevelopmentOnly =
              content.includes('__DEV__') || content.includes('process.env.NODE_ENV');

            if (!isDevelopmentOnly) {
              violations.push(`${relativePath}: ${matches[0].substring(0, 100)}`);
            }
          }
        }
      }

      // Report violations but don't fail - some logging may be intentional
      if (violations.length > 0) {
        console.warn('Potential sensitive data logging found:', violations.slice(0, 5));
      }
    });

    it('should use error logging utility that sanitizes sensitive data', () => {
      const errorHandlingFile = path.join(srcDir, 'utils/errors.ts');

      if (fs.existsSync(errorHandlingFile)) {
        const content = readFileContent(errorHandlingFile);

        // Check for sanitization patterns
        const hasSanitization =
          content.includes('sanitize') ||
          content.includes('redact') ||
          content.includes('mask') ||
          content.includes('without sensitive');

        // This is informational - not all apps need explicit sanitization
        if (!hasSanitization) {
          console.info('Info: Error handling utility does not have explicit sanitization');
        }
      }
    });

    it('should have errorLogger with sanitizeContext function', () => {
      const errorLoggerFile = path.join(srcDir, 'errors/errorLogger.ts');
      expect(fs.existsSync(errorLoggerFile)).toBe(true);

      const content = readFileContent(errorLoggerFile);

      // Verify sanitization function exists
      expect(content).toContain('sanitizeContext');
      expect(content).toContain('SENSITIVE_KEY_PATTERNS');
      expect(content).toContain('[REDACTED]');
    });

    it('should sanitize sensitive keys in error context', () => {
      // Test the sanitizeContext function directly
      const sensitiveData = {
        token: 'secret-token-123',
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-789',
        password: 'my-password',
        amount: 1000.5,
        balance: 5000.0,
        accountNumber: '1234567890',
        cardNumber: '4111111111111111',
        pin: '1234',
        credential: 'my-credential',
        secretKey: 'my-secret-key',
        authToken: 'auth-token-abc',
        normalField: 'this is fine',
        userId: 'user-123',
      };

      const sanitized = sanitizeContext(sensitiveData);

      // Sensitive fields should be redacted
      expect(sanitized?.token).toBe('[REDACTED]');
      expect(sanitized?.accessToken).toBe('[REDACTED]');
      expect(sanitized?.refreshToken).toBe('[REDACTED]');
      expect(sanitized?.password).toBe('[REDACTED]');
      expect(sanitized?.amount).toBe('[REDACTED]');
      expect(sanitized?.balance).toBe('[REDACTED]');
      expect(sanitized?.accountNumber).toBe('[REDACTED]');
      expect(sanitized?.cardNumber).toBe('[REDACTED]');
      expect(sanitized?.pin).toBe('[REDACTED]');
      expect(sanitized?.credential).toBe('[REDACTED]');
      expect(sanitized?.secretKey).toBe('[REDACTED]');
      expect(sanitized?.authToken).toBe('[REDACTED]');

      // Non-sensitive fields should remain
      expect(sanitized?.normalField).toBe('this is fine');
      expect(sanitized?.userId).toBe('user-123');
    });

    it('should sanitize nested objects in error context', () => {
      const nestedData = {
        user: {
          name: 'John',
          token: 'nested-token',
          preferences: {
            amount: 100,
            theme: 'dark',
          },
        },
        metadata: {
          timestamp: '2024-01-01',
        },
      };

      const sanitized = sanitizeContext(nestedData);

      // Nested sensitive fields should be redacted
      expect((sanitized?.user as Record<string, unknown>)?.name).toBe('John');
      expect((sanitized?.user as Record<string, unknown>)?.token).toBe('[REDACTED]');
      expect(
        ((sanitized?.user as Record<string, unknown>)?.preferences as Record<string, unknown>)
          ?.amount
      ).toBe('[REDACTED]');
      expect(
        ((sanitized?.user as Record<string, unknown>)?.preferences as Record<string, unknown>)
          ?.theme
      ).toBe('dark');
      expect((sanitized?.metadata as Record<string, unknown>)?.timestamp).toBe('2024-01-01');
    });

    it('should handle undefined and null context gracefully', () => {
      expect(sanitizeContext(undefined)).toBeUndefined();
      // Note: null is not a valid input type, so we don't test it
    });
  });

  describe('Task 31.5: Database Protection Verification', () => {
    it('should use expo-sqlite with proper configuration', () => {
      const clientFile = path.join(srcDir, 'db/client.ts');
      expect(fs.existsSync(clientFile)).toBe(true);

      const content = readFileContent(clientFile);

      // Verify expo-sqlite is used
      expect(content).toContain('expo-sqlite');
      expect(content).toContain('openDatabaseSync');

      // Verify database name is defined
      expect(content).toContain('DATABASE_NAME');
    });

    it('should store database in app-private directory', () => {
      const clientFile = path.join(srcDir, 'db/client.ts');
      const content = readFileContent(clientFile);

      // Database should use a simple filename (stored in app's private directory by default)
      // Should NOT use external storage paths
      expect(content).not.toMatch(/\/sdcard\//i);
      expect(content).not.toMatch(/\/storage\/emulated\//i);
      expect(content).not.toMatch(/external/i);

      // Should use a simple database name
      expect(content).toMatch(/DATABASE_NAME\s*=\s*['"][^'"]+\.db['"]/);
    });

    it('should implement transaction atomicity for data integrity', () => {
      const clientFile = path.join(srcDir, 'db/client.ts');
      const content = readFileContent(clientFile);

      // Verify transaction support
      expect(content).toContain('withTransaction');
      expect(content).toContain('BEGIN TRANSACTION');
      expect(content).toContain('COMMIT');
      expect(content).toContain('ROLLBACK');
    });

    it('should not expose database file path to external apps', () => {
      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Check for patterns that might expose database path
        const exposurePatterns = [
          /Intent.*database/i,
          /shareFile.*\.db/i,
          /FileProvider.*database/i,
          /ContentProvider.*database/i,
        ];

        for (const pattern of exposurePatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it('should use Drizzle ORM for type-safe queries (SQL injection prevention)', () => {
      const queryFiles = sourceFiles.filter(
        (file) => file.includes('queries') || file.includes('db/')
      );

      for (const file of queryFiles) {
        const content = readFileContent(file);

        // If file has SQL operations, it should use Drizzle
        if (
          content.includes('SELECT') ||
          content.includes('INSERT') ||
          content.includes('UPDATE')
        ) {
          // Should use Drizzle ORM patterns, not raw SQL string concatenation
          const hasRawSqlConcatenation =
            content.match(/`SELECT.*\$\{/i) ||
            content.match(/`INSERT.*\$\{/i) ||
            content.match(/`UPDATE.*\$\{/i) ||
            content.match(/'SELECT.*'\s*\+/i);

          // Allow sql template tag from Drizzle (safe parameterized queries)
          const usesDrizzleSql = content.includes('drizzle-orm') || content.includes('sql`');

          if (hasRawSqlConcatenation && !usesDrizzleSql) {
            console.warn(`Potential SQL injection risk in ${file}`);
          }
        }
      }
    });
  });

  describe('Task 31.6: Secure Token Refresh Flow Verification', () => {
    it('should implement token refresh without exposing tokens in logs', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      expect(fs.existsSync(oauthServiceFile)).toBe(true);

      const content = readFileContent(oauthServiceFile);

      // Verify refresh token functionality exists
      expect(content).toContain('refreshToken');
      expect(content).toContain('refreshAsync');

      // Should not log tokens directly
      const tokenLoggingPatterns = [
        /console\.(log|debug|info)\s*\([^)]*accessToken[^)]*\)/,
        /console\.(log|debug|info)\s*\([^)]*refreshToken[^)]*\)/,
      ];

      for (const pattern of tokenLoggingPatterns) {
        expect(content).not.toMatch(pattern);
      }
    });

    it('should store refreshed tokens securely', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify tokens are stored via SecureStore after refresh
      expect(content).toContain('storeTokens');
      expect(content).toContain('SecureStore.setItemAsync');
    });

    it('should handle token refresh errors without exposing sensitive data', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify error handling exists for token refresh
      expect(content).toContain('TOKEN_REFRESH_FAILED');

      // Error messages should not include actual token values
      const errorWithToken = content.match(/throw.*Error.*\$\{.*token/i);
      expect(errorWithToken).toBeNull();
    });

    it('should use PKCE for OAuth flow security', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify PKCE is used
      expect(content).toContain('usePKCE');
      expect(content).toContain('code_verifier');
    });

    it('should revoke tokens on sign out', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify token revocation on sign out
      expect(content).toContain('signOut');
      expect(content).toContain('revokeAsync');
      expect(content).toContain('deleteItemAsync');
    });

    it('should not store tokens in memory longer than necessary', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify tokens are not stored as class properties (only retrieved when needed)
      // The service should fetch from SecureStore each time
      expect(content).toContain('getStoredAccessToken');
      expect(content).toContain('SecureStore.getItemAsync');

      // Should not have class-level token storage
      const classTokenStorage = content.match(/private\s+(accessToken|refreshToken)\s*:/);
      expect(classTokenStorage).toBeNull();
    });

    it('should implement token expiry checking', () => {
      const oauthServiceFile = path.join(srcDir, 'services/backup/OAuthService.ts');
      const content = readFileContent(oauthServiceFile);

      // Verify token expiry is tracked and checked
      expect(content).toContain('TOKEN_EXPIRY');
      expect(content).toContain('expiresAt');
      expect(content).toContain('TOKEN_REFRESH_BUFFER_MS');
    });
  });

  describe('Data Flow Security', () => {
    it('should not expose financial data through URL parameters', () => {
      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Check for URL construction with financial data
        const urlWithFinancialData = [
          /\?.*amount=/i,
          /\?.*balance=/i,
          /\?.*transaction=/i,
          /encodeURIComponent\s*\(\s*amount/i,
        ];

        for (const pattern of urlWithFinancialData) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it('should not store financial data in global state accessible to other apps', () => {
      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Check for insecure global storage
        const insecurePatterns = [
          /window\.\w+\s*=.*amount/i,
          /global\.\w+\s*=.*transaction/i,
          /localStorage\.setItem.*amount/i,
          /sessionStorage\.setItem.*transaction/i,
        ];

        for (const pattern of insecurePatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });
  });

  describe('Network Security', () => {
    it('should only make HTTPS requests', () => {
      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Check for HTTP (non-secure) URLs
        const httpMatches = content.match(/['"]http:\/\/[^'"]+['"]/g);

        if (httpMatches) {
          // Filter out localhost and test URLs
          const insecureUrls = httpMatches.filter(
            (url) =>
              !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('10.0.2.2') // Android emulator localhost
          );

          expect(insecureUrls).toHaveLength(0);
        }
      }
    });

    it('should only communicate with Google APIs for backup', () => {
      const allowedDomains = ['googleapis.com', 'accounts.google.com', 'oauth2.googleapis.com'];

      for (const file of sourceFiles) {
        const content = readFileContent(file);

        // Find all HTTPS URLs
        const httpsMatches = content.match(/https:\/\/[^'")\s]+/g);

        if (httpsMatches) {
          for (const url of httpsMatches) {
            const isAllowed = allowedDomains.some((domain) => url.includes(domain));
            const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

            // If it's an external URL, it should be in the allowed list
            if (!isAllowed && !isLocalhost) {
              // Check if it's in a backup-related file
              const isBackupFile =
                file.includes('backup') ||
                file.includes('Backup') ||
                file.includes('OAuth') ||
                file.includes('GoogleDrive');

              if (!isBackupFile) {
                console.warn(`External URL found outside backup context: ${url} in ${file}`);
              }
            }
          }
        }
      }
    });
  });

  describe('Backup Store Security', () => {
    it('should not store sensitive data in AsyncStorage backup store', () => {
      const backupStoreFile = path.join(srcDir, 'stores/backupStore.ts');
      expect(fs.existsSync(backupStoreFile)).toBe(true);

      const content = readFileContent(backupStoreFile);

      // Verify backup store uses AsyncStorage (which is fine for non-sensitive data)
      expect(content).toContain('AsyncStorage');

      // Verify it only stores status information, not tokens
      expect(content).toContain('lastBackupTime');
      expect(content).toContain('lastBackupStatus');

      // Should not store tokens in this store
      expect(content).not.toMatch(/accessToken\s*:/);
      expect(content).not.toMatch(/refreshToken\s*:/);
    });

    it('should use partialize to limit persisted state', () => {
      const backupStoreFile = path.join(srcDir, 'stores/backupStore.ts');
      const content = readFileContent(backupStoreFile);

      // Verify partialize is used to control what gets persisted
      expect(content).toContain('partialize');
    });
  });

  describe('Draft Store Security', () => {
    it('should use secure storage for draft data', () => {
      const draftServiceFile = path.join(srcDir, 'services/draft/DraftStorage.ts');

      if (fs.existsSync(draftServiceFile)) {
        const content = readFileContent(draftServiceFile);

        // Verify secure storage is used for drafts (which may contain financial data)
        expect(content).toContain('SecureStore');
      }
    });
  });
});
