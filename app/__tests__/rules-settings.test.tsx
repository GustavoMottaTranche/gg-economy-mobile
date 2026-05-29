/**
 * Rules Management Screen Tests
 *
 * Tests for the Categorization Rules Management screen component.
 * Validates:
 * - Rules list rendering
 * - Create rule form with pattern, match type, category, priority
 * - Edit rule form
 * - Delete rule action
 *
 * **Validates: Requirements 18, 27, 30**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useCategorizationRules hook
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

const mockCategory = {
  id: 'cat-1',
  name: 'Transport',
  type: 'expense' as const,
  icon: '🚗',
  color: '#007AFF',
  isActive: true,
  createdAt: new Date('2024-01-01'),
};

const mockRule = {
  id: 'rule-1',
  pattern: 'UBER',
  categoryId: 'cat-1',
  matchType: 'contains' as const,
  priority: 10,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  category: mockCategory,
};

const mockRule2 = {
  id: 'rule-2',
  pattern: 'SALARY',
  categoryId: 'cat-2',
  matchType: 'exact' as const,
  priority: 5,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  category: {
    id: 'cat-2',
    name: 'Salary',
    type: 'income' as const,
    icon: '💰',
    color: '#34C759',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
};

const defaultUseCategorizationRulesReturn = {
  rules: [mockRule, mockRule2],
  isLoading: false,
  error: null as string | null,
  totalCount: 2,
  activeCount: 2,
  create: mockCreate,
  update: mockUpdate,
  remove: mockRemove,
};

let mockUseCategorizationRulesReturn = { ...defaultUseCategorizationRulesReturn };

jest.mock('../../src/hooks/useCategorizationRules', () => ({
  useCategorizationRules: () => mockUseCategorizationRulesReturn,
}));

// Mock useCategories hook
const mockCategories = [mockCategory, mockRule2.category];

jest.mock('../../src/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
  }),
}));

// Mock CategorySelector
jest.mock('../../src/components/CategorySelector', () => ({
  CategorySelector: ({
    onSelect,
    testID,
  }: {
    selectedCategoryId?: string | null;
    onSelect: (category: { id: string; name: string; type: string }) => void;
    includeIncome?: boolean;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        {mockCategories.map(
          (cat: { id: string; name: string; type: string; icon: string; color: string }) => (
            <TouchableOpacity
              key={cat.id}
              testID={`category-option-${cat.id}`}
              onPress={() => onSelect(cat)}
            >
              <Text>{cat.name}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'rules.addRule': 'Add Rule',
        'rules.editRule': 'Edit Rule',
        'rules.deleteRule': 'Delete Rule',
        'rules.noRules': 'No rules',
        'rules.pattern': 'Pattern',
        'rules.patternPlaceholder': 'Enter pattern',
        'rules.patternRequired': 'Pattern is required',
        'rules.patternHint': 'Text to match in transaction description',
        'rules.matchType': 'Match Type',
        'rules.matchTypeHelp': 'Match Type Help',
        'rules.matchContains': 'Contains',
        'rules.matchStartsWith': 'Starts with',
        'rules.matchEndsWith': 'Ends with',
        'rules.matchExact': 'Exact match',
        'rules.matchRegex': 'Regex',
        'rules.containsDescription': 'Matches if description contains the pattern',
        'rules.starts_withDescription': 'Matches if description starts with the pattern',
        'rules.ends_withDescription': 'Matches if description ends with the pattern',
        'rules.exactDescription': 'Matches if description exactly equals the pattern',
        'rules.regexDescription': 'Matches using a regular expression pattern',
        'rules.category': 'Category',
        'rules.selectCategory': 'Select category',
        'rules.categoryRequired': 'Category is required',
        'rules.categoryDeleted': 'Category deleted',
        'rules.priority': 'Priority',
        'rules.priorityHint': 'Higher priority rules are checked first',
        'rules.deleteConfirmation': `Delete rule "${params?.pattern}"?`,
        'rules.deleteError': 'Failed to delete rule',
        'rules.saveError': 'Failed to save rule',
        'settings.rulesDescription': 'Manage automatic categorization rules',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Import the component after mocks
import RulesSettingsScreen from '../(tabs)/settings/rules';

describe('RulesSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCategorizationRulesReturn = { ...defaultUseCategorizationRulesReturn };
  });

  describe('Rendering', () => {
    it('renders the rules settings screen', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('rules-settings-screen')).toBeTruthy();
    });

    it('renders Add Rule button', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('add-rule-button')).toBeTruthy();
      expect(screen.getByText('Add Rule')).toBeTruthy();
    });

    it('renders help section', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByText('Match Type Help')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      mockUseCategorizationRulesReturn = {
        ...defaultUseCategorizationRulesReturn,
        isLoading: true,
      };

      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('rules-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('shows error message when there is an error', () => {
      mockUseCategorizationRulesReturn = {
        ...defaultUseCategorizationRulesReturn,
        error: 'Failed to load rules',
      };

      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('rules-error')).toBeTruthy();
      expect(screen.getByText('Failed to load rules')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no rules', () => {
      mockUseCategorizationRulesReturn = {
        ...defaultUseCategorizationRulesReturn,
        rules: [],
      };

      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('rules-empty')).toBeTruthy();
      expect(screen.getByText('No rules')).toBeTruthy();
    });
  });

  describe('Rules List', () => {
    it('renders all rules', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('rule-item-rule-1')).toBeTruthy();
      expect(screen.getByTestId('rule-item-rule-2')).toBeTruthy();
    });

    it('displays rule pattern', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByText('"UBER"')).toBeTruthy();
      expect(screen.getByText('"SALARY"')).toBeTruthy();
    });

    it('displays rule priority', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByText('#10')).toBeTruthy();
      expect(screen.getByText('#5')).toBeTruthy();
    });

    it('displays rule category', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByText('Transport')).toBeTruthy();
      expect(screen.getByText('Salary')).toBeTruthy();
    });

    it('displays match type', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getAllByText('Contains').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Exact match').length).toBeGreaterThan(0);
    });
  });

  describe('Edit Rule', () => {
    it('renders edit button for each rule', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('edit-rule-rule-1')).toBeTruthy();
      expect(screen.getByTestId('edit-rule-rule-2')).toBeTruthy();
    });

    it('opens edit modal when edit button is pressed', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('edit-rule-rule-1'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-form-modal')).toBeTruthy();
        expect(screen.getByText('Edit Rule')).toBeTruthy();
      });
    });
  });

  describe('Delete Rule', () => {
    it('renders delete button for each rule', () => {
      render(<RulesSettingsScreen />);

      expect(screen.getByTestId('delete-rule-rule-1')).toBeTruthy();
      expect(screen.getByTestId('delete-rule-rule-2')).toBeTruthy();
    });

    it('shows confirmation alert when delete button is pressed', () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('delete-rule-rule-1'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Rule',
        'Delete rule "UBER"?',
        expect.any(Array)
      );
    });
  });

  describe('Create Rule Form', () => {
    it('opens create modal when Add Rule is pressed', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-form-modal')).toBeTruthy();
        // Modal title and button both have "Add Rule" text
        expect(screen.getAllByText('Add Rule').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('renders pattern input field', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-pattern-input')).toBeTruthy();
      });
    });

    it('renders match type picker', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('match-type-picker-button')).toBeTruthy();
      });
    });

    it('renders category picker', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-picker-button')).toBeTruthy();
      });
    });

    it('renders priority input field', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-priority-input')).toBeTruthy();
      });
    });

    it('shows match type options when picker is pressed', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('match-type-picker-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('match-type-picker-button'));

      await waitFor(() => {
        expect(screen.getByTestId('match-type-picker')).toBeTruthy();
        expect(screen.getByTestId('match-type-option-contains')).toBeTruthy();
        expect(screen.getByTestId('match-type-option-exact')).toBeTruthy();
      });
    });

    it('shows category options when picker is pressed', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-picker-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('category-picker-button'));

      await waitFor(() => {
        expect(screen.getByTestId('category-picker')).toBeTruthy();
        expect(screen.getByTestId('category-option-cat-1')).toBeTruthy();
      });
    });

    it('closes modal when cancel is pressed', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-form-modal')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('close-rule-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('rule-form-modal')).toBeNull();
      });
    });

    it('save button is disabled when pattern is empty', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('save-rule-button')).toBeTruthy();
      });

      // Save button should be disabled when pattern is empty
      const saveButton = screen.getByTestId('save-rule-button');
      expect(
        saveButton.props.accessibilityState?.disabled || saveButton.props.disabled
      ).toBeTruthy();
    });

    it('save button is disabled when category is not selected', async () => {
      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-pattern-input')).toBeTruthy();
      });

      fireEvent.changeText(screen.getByTestId('rule-pattern-input'), 'TEST');

      // Save button should still be disabled when category is not selected
      const saveButton = screen.getByTestId('save-rule-button');
      expect(
        saveButton.props.accessibilityState?.disabled || saveButton.props.disabled
      ).toBeTruthy();
    });

    it('calls create when saving new rule', async () => {
      mockCreate.mockResolvedValue({ id: 'new-1', pattern: 'NEW' });

      render(<RulesSettingsScreen />);

      fireEvent.press(screen.getByTestId('add-rule-button'));

      await waitFor(() => {
        expect(screen.getByTestId('rule-pattern-input')).toBeTruthy();
      });

      // Fill pattern
      fireEvent.changeText(screen.getByTestId('rule-pattern-input'), 'NEW PATTERN');

      // Select category
      fireEvent.press(screen.getByTestId('category-picker-button'));
      await waitFor(() => {
        expect(screen.getByTestId('category-option-cat-1')).toBeTruthy();
      });
      fireEvent.press(screen.getByTestId('category-option-cat-1'));

      // Save
      fireEvent.press(screen.getByTestId('save-rule-button'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            pattern: 'NEW PATTERN',
            categoryId: 'cat-1',
            matchType: 'contains',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('add button has accessible role', () => {
      render(<RulesSettingsScreen />);

      const button = screen.getByTestId('add-rule-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('add button has accessible label', () => {
      render(<RulesSettingsScreen />);

      const button = screen.getByTestId('add-rule-button');
      expect(button.props.accessibilityLabel).toBe('Add Rule');
    });

    it('edit buttons have accessible role', () => {
      render(<RulesSettingsScreen />);

      const button = screen.getByTestId('edit-rule-rule-1');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('delete buttons have accessible role', () => {
      render(<RulesSettingsScreen />);

      const button = screen.getByTestId('delete-rule-rule-1');
      expect(button.props.accessibilityRole).toBe('button');
    });
  });
});
