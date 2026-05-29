/**
 * DraftStorage Service
 *
 * Provides secure storage for form drafts using expo-secure-store.
 * Handles serialization/deserialization of draft data with type safety.
 *
 * **Validates: Requirements 24.1-24.6**
 */
import * as SecureStore from 'expo-secure-store';

/**
 * Supported draft form types
 */
export type DraftFormType =
  | 'manual-entry'
  | 'category-create'
  | 'category-edit'
  | 'rule-create'
  | 'rule-edit';

/**
 * Draft data for manual transaction entry form
 */
export interface ManualEntryDraft {
  title?: string; // Primary identifier for the entry (1-100 chars)
  date?: string; // ISO date string
  amount?: string; // String to preserve user input format
  description?: string;
  categoryId?: string | null;
  referenceMonth?: string; // YYYY-MM format
  type?: 'income' | 'expense';
}

/**
 * Draft data for category creation/edit form
 */
export interface CategoryDraft {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string;
  color?: string;
}

/**
 * Draft data for categorization rule creation/edit form
 */
export interface RuleDraft {
  pattern?: string;
  categoryId?: string;
  matchType?: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
  priority?: number;
}

/**
 * Union type for all draft data types
 */
export type DraftData = ManualEntryDraft | CategoryDraft | RuleDraft;

/**
 * Stored draft with metadata
 */
export interface StoredDraft<T extends DraftData = DraftData> {
  formType: DraftFormType;
  data: T;
  savedAt: string; // ISO timestamp
  formId?: string; // Optional identifier for edit forms (e.g., category ID being edited)
}

/**
 * Result type for draft operations
 */
export interface DraftResult<T extends DraftData = DraftData> {
  success: boolean;
  draft?: StoredDraft<T>;
  error?: string;
}

/**
 * Generates the storage key for a draft
 */
function getDraftKey(formType: DraftFormType, formId?: string): string {
  const baseKey = `draft_${formType}`;
  return formId ? `${baseKey}_${formId}` : baseKey;
}

/**
 * Validates that the data is a valid JSON-serializable object
 */
function isValidDraftData(data: unknown): data is DraftData {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

/**
 * DraftStorage class for managing form drafts
 */
export class DraftStorage {
  /**
   * Saves draft data to secure storage
   *
   * @param formType - The type of form being saved
   * @param data - The draft data to save
   * @param formId - Optional identifier for edit forms
   * @returns Promise resolving to operation result
   */
  async saveDraft<T extends DraftData>(
    formType: DraftFormType,
    data: T,
    formId?: string
  ): Promise<DraftResult<T>> {
    try {
      if (!isValidDraftData(data)) {
        return {
          success: false,
          error: 'Invalid draft data: must be a non-null object',
        };
      }

      const key = getDraftKey(formType, formId);
      const storedDraft: StoredDraft<T> = {
        formType,
        data,
        savedAt: new Date().toISOString(),
        formId,
      };

      const serialized = JSON.stringify(storedDraft);
      await SecureStore.setItemAsync(key, serialized);

      return {
        success: true,
        draft: storedDraft,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save draft',
      };
    }
  }

  /**
   * Retrieves draft data from secure storage
   *
   * @param formType - The type of form to retrieve
   * @param formId - Optional identifier for edit forms
   * @returns Promise resolving to the stored draft or null
   */
  async getDraft<T extends DraftData>(
    formType: DraftFormType,
    formId?: string
  ): Promise<DraftResult<T>> {
    try {
      const key = getDraftKey(formType, formId);
      const serialized = await SecureStore.getItemAsync(key);

      if (!serialized) {
        return {
          success: true,
          draft: undefined,
        };
      }

      const storedDraft = JSON.parse(serialized) as StoredDraft<T>;

      // Validate the stored draft structure
      if (!storedDraft.formType || !storedDraft.data || !storedDraft.savedAt) {
        return {
          success: false,
          error: 'Invalid stored draft structure',
        };
      }

      return {
        success: true,
        draft: storedDraft,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve draft',
      };
    }
  }

  /**
   * Clears draft data from secure storage
   *
   * @param formType - The type of form to clear
   * @param formId - Optional identifier for edit forms
   * @returns Promise resolving to operation result
   */
  async clearDraft(formType: DraftFormType, formId?: string): Promise<DraftResult> {
    try {
      const key = getDraftKey(formType, formId);
      await SecureStore.deleteItemAsync(key);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear draft',
      };
    }
  }

  /**
   * Checks if a draft exists for the given form
   *
   * @param formType - The type of form to check
   * @param formId - Optional identifier for edit forms
   * @returns Promise resolving to boolean indicating if draft exists
   */
  async hasDraft(formType: DraftFormType, formId?: string): Promise<boolean> {
    try {
      const key = getDraftKey(formType, formId);
      const value = await SecureStore.getItemAsync(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clears all drafts for a specific form type (including all formIds)
   * Note: This only clears the base draft without formId
   *
   * @param formType - The type of form to clear
   * @returns Promise resolving to operation result
   */
  async clearAllDraftsForType(formType: DraftFormType): Promise<DraftResult> {
    try {
      // Clear the base draft (without formId)
      const key = getDraftKey(formType);
      await SecureStore.deleteItemAsync(key);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear drafts',
      };
    }
  }
}

// Export singleton instance
export const draftStorage = new DraftStorage();
