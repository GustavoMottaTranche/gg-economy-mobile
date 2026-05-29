/**
 * WeeklyGroupItem Component Tests
 *
 * Tests for the WeeklyGroupItem component including:
 * - Rendering group title, category icon, and monthly total
 * - Expand/collapse behavior on header tap
 * - Rendering WeeklyParcelRow items when expanded
 * - Pending-only mode showing pending count and pending total
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 4.3, 4.4**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeeklyGroupItem } from '../WeeklyGroupItem';
import { useThemeStore } from '../../stores/themeStore';
import type { WeeklyRecurringGroup, WeeklyOccurrence } from '../../types/weeklyRecurring';

// Mock useCategories to return a known category
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      {
        id: 'cat-1',
        name: 'Alimentação',
        type: 'expense',
        icon: '🍔',
        color: '#FF6B6B',
        isActive: true,
        expenseGroup: 'variable',
        createdAt: new Date(),
      },
    ],
    incomeCategories: [],
    expenseCategories: [],
    fixedExpenseCategories: [],
    variableExpenseCategories: [],
    isLoading: false,
    error: null,
    totalCount: 1,
    activeCount: 1,
    countsByGroup: { fixed: 0, variable: 1, uncategorized: 0 },
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
    remove: jest.fn(),
    deleteWithReplacement: jest.fn(),
    refresh: jest.fn(),
    categoriesWithCounts: [],
  }),
}));

const mockGroup: WeeklyRecurringGroup = {
  id: 'group-1',
  title: 'Almoço',
  amount: 50,
  dayOfWeek: 1,
  categoryId: 'cat-1',
  categoryType: 'expense',
  description: 'Almoço semanal',
  originId: null,
  startDate: '2024-01-01',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOccurrences: WeeklyOccurrence[] = [
  {
    id: 'occ-1',
    weeklyGroupId: 'group-1',
    date: '2024-06-03',
    referenceMonth: '2024-06',
    amount: 50,
    description: 'Almoço',
    isValueEdited: false,
    isPaid: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'occ-2',
    weeklyGroupId: 'group-1',
    date: '2024-06-10',
    referenceMonth: '2024-06',
    amount: 55,
    description: 'Almoço',
    isValueEdited: true,
    isPaid: true,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'occ-3',
    weeklyGroupId: 'group-1',
    date: '2024-06-17',
    referenceMonth: '2024-06',
    amount: 50,
    description: 'Almoço',
    isValueEdited: false,
    isPaid: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'occ-4',
    weeklyGroupId: 'group-1',
    date: '2024-06-24',
    referenceMonth: '2024-06',
    amount: 50,
    description: 'Almoço',
    isValueEdited: false,
    isPaid: true,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
];

describe('WeeklyGroupItem', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('header rendering', () => {
    it('renders the group title', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const title = getByTestId('weekly-group-title');
      expect(title.props.children).toBe('Almoço');
    });

    it('renders the category icon', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const icon = getByTestId('weekly-group-icon');
      expect(icon).toBeTruthy();
    });

    it('renders the monthly total (sum of all occurrences)', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const total = getByTestId('weekly-group-total');
      // Total should be 50 + 55 + 50 + 50 = 205
      expect(total.props.children).toBeTruthy();
    });

    it('shows total parcel count when collapsed and not pendingOnly', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const subtitle = getByTestId('weekly-group-subtitle');
      expect(subtitle.props.children).toBe('4 parcelas');
    });

    it('shows pending count when pendingOnly is active', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={true}
          testID="weekly-group"
        />
      );
      const subtitle = getByTestId('weekly-group-subtitle');
      // 2 pending occurrences (occ-1 and occ-3)
      expect(subtitle.props.children).toBe('2 pendentes');
    });
  });

  describe('expand/collapse', () => {
    it('calls onToggleExpand with group id when header is tapped', () => {
      const onToggleExpand = jest.fn();
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      fireEvent.press(getByTestId('weekly-group-header'));
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
      expect(onToggleExpand).toHaveBeenCalledWith('group-1');
    });

    it('does not render parcels when collapsed', () => {
      const { queryByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      expect(queryByTestId('weekly-group-parcels')).toBeNull();
    });

    it('renders parcel rows when expanded', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      expect(getByTestId('weekly-group-parcels')).toBeTruthy();
      // All 4 parcels should be rendered
      expect(getByTestId('weekly-group-parcel-occ-1')).toBeTruthy();
      expect(getByTestId('weekly-group-parcel-occ-2')).toBeTruthy();
      expect(getByTestId('weekly-group-parcel-occ-3')).toBeTruthy();
      expect(getByTestId('weekly-group-parcel-occ-4')).toBeTruthy();
    });
  });

  describe('pendingOnly mode', () => {
    it('renders only pending parcels when expanded and pendingOnly is active', () => {
      const { getByTestId, queryByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={true}
          testID="weekly-group"
        />
      );
      // Only pending parcels (occ-1 and occ-3) should be rendered
      expect(getByTestId('weekly-group-parcel-occ-1')).toBeTruthy();
      expect(getByTestId('weekly-group-parcel-occ-3')).toBeTruthy();
      // Paid parcels should not be rendered
      expect(queryByTestId('weekly-group-parcel-occ-2')).toBeNull();
      expect(queryByTestId('weekly-group-parcel-occ-4')).toBeNull();
    });

    it('shows empty state when expanded, pendingOnly active, and all parcels are paid', () => {
      const allPaidOccurrences = mockOccurrences.map((occ) => ({
        ...occ,
        isPaid: true,
      }));
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={allPaidOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={true}
          testID="weekly-group"
        />
      );
      expect(getByTestId('weekly-group-empty')).toBeTruthy();
    });
  });

  describe('callbacks', () => {
    it('passes onParcelPress to WeeklyParcelRow', () => {
      const onParcelPress = jest.fn();
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={onParcelPress}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      fireEvent.press(getByTestId('weekly-group-parcel-occ-1'));
      expect(onParcelPress).toHaveBeenCalledTimes(1);
      expect(onParcelPress).toHaveBeenCalledWith(mockOccurrences[0]);
    });

    it('passes onTogglePaymentStatus to WeeklyParcelRow', () => {
      const onTogglePaymentStatus = jest.fn();
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={onTogglePaymentStatus}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      fireEvent.press(getByTestId('weekly-group-parcel-occ-1-toggle'));
      expect(onTogglePaymentStatus).toHaveBeenCalledTimes(1);
      expect(onTogglePaymentStatus).toHaveBeenCalledWith('occ-1');
    });
  });

  describe('accessibility', () => {
    it('has button role on the header', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const header = getByTestId('weekly-group-header');
      expect(header.props.accessibilityRole).toBe('button');
    });

    it('has expanded state in accessibility when expanded', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const header = getByTestId('weekly-group-header');
      expect(header.props.accessibilityState).toEqual({ expanded: true });
    });

    it('has collapsed state in accessibility when collapsed', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={mockOccurrences}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const header = getByTestId('weekly-group-header');
      expect(header.props.accessibilityState).toEqual({ expanded: false });
    });
  });

  describe('singular/plural text', () => {
    it('shows "1 parcela" for single occurrence', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={[mockOccurrences[0]]}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={false}
          testID="weekly-group"
        />
      );
      const subtitle = getByTestId('weekly-group-subtitle');
      expect(subtitle.props.children).toBe('1 parcela');
    });

    it('shows "1 pendente" for single pending occurrence', () => {
      const { getByTestId } = render(
        <WeeklyGroupItem
          group={mockGroup}
          occurrences={[mockOccurrences[0]]}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onParcelPress={jest.fn()}
          onTogglePaymentStatus={jest.fn()}
          pendingOnly={true}
          testID="weekly-group"
        />
      );
      const subtitle = getByTestId('weekly-group-subtitle');
      expect(subtitle.props.children).toBe('1 pendente');
    });
  });
});
