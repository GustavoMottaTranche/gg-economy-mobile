/**
 * InstallmentPreview Component Tests
 *
 * Tests for the InstallmentPreview component including:
 * - Renders ordered list of parcels with number, month, and value
 * - Shows "no amount" hint when parcel amount is 0
 * - Formats months using locale
 * - Returns null when installments array is empty
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { InstallmentPreview } from '../InstallmentPreview';
import type { InstallmentDetail } from '../../types/installment';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'manual.installment.preview': 'Installment preview',
        'manual.installment.noAmountPreview': 'Enter the total amount to see values',
      };
      if (key === 'manual.installment.parcelLabel' && params) {
        return `Installment ${params.index}/${params.total}`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock AmountDisplay
jest.mock('../ui/AmountDisplay', () => ({
  AmountDisplay: ({ amount, testID }: { amount: number; testID?: string }) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{`R$ ${(amount / 100).toFixed(2)}`}</Text>;
  },
}));

describe('InstallmentPreview', () => {
  const baseInstallments: InstallmentDetail[] = [
    {
      index: 1,
      totalParcels: 3,
      amount: 334,
      referenceMonth: '2025-01',
      descriptionSuffix: ' (1/3)',
    },
    {
      index: 2,
      totalParcels: 3,
      amount: 333,
      referenceMonth: '2025-02',
      descriptionSuffix: ' (2/3)',
    },
    {
      index: 3,
      totalParcels: 3,
      amount: 333,
      referenceMonth: '2025-03',
      descriptionSuffix: ' (3/3)',
    },
  ];

  it('renders null when installments array is empty', () => {
    const { toJSON } = render(
      <InstallmentPreview
        installments={[]}
        locale="en-US"
        transactionType="expense"
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the preview title', () => {
    const { getByText } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="expense"
      />
    );
    expect(getByText('Installment preview')).toBeTruthy();
  });

  it('renders all parcel items', () => {
    const { getByTestId } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="expense"
        testID="preview"
      />
    );
    expect(getByTestId('preview-item-1')).toBeTruthy();
    expect(getByTestId('preview-item-2')).toBeTruthy();
    expect(getByTestId('preview-item-3')).toBeTruthy();
  });

  it('displays parcel labels with correct format (X/N)', () => {
    const { getByText } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="expense"
      />
    );
    expect(getByText('Installment 1/3')).toBeTruthy();
    expect(getByText('Installment 2/3')).toBeTruthy();
    expect(getByText('Installment 3/3')).toBeTruthy();
  });

  it('formats months using locale (en-US)', () => {
    const { getByText } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="expense"
      />
    );
    // Intl.DateTimeFormat with en-US should produce "January 2025", etc.
    expect(getByText(/January 2025/i)).toBeTruthy();
    expect(getByText(/February 2025/i)).toBeTruthy();
    expect(getByText(/March 2025/i)).toBeTruthy();
  });

  it('formats months using locale (pt-BR)', () => {
    const { getByText } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="pt-BR"
        transactionType="expense"
      />
    );
    // Intl.DateTimeFormat with pt-BR should produce Portuguese month names
    expect(getByText(/janeiro de 2025/i)).toBeTruthy();
    expect(getByText(/fevereiro de 2025/i)).toBeTruthy();
    expect(getByText(/março de 2025/i)).toBeTruthy();
  });

  it('shows AmountDisplay for parcels with amount > 0 (expense)', () => {
    const { getByTestId } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="expense"
        testID="preview"
      />
    );
    // AmountDisplay should be rendered with negative amount for expenses
    expect(getByTestId('preview-amount-1')).toBeTruthy();
    expect(getByTestId('preview-amount-2')).toBeTruthy();
    expect(getByTestId('preview-amount-3')).toBeTruthy();
  });

  it('shows "no amount" hint when parcel amount is 0', () => {
    const installmentsNoAmount: InstallmentDetail[] = [
      {
        index: 1,
        totalParcels: 2,
        amount: 0,
        referenceMonth: '2025-06',
        descriptionSuffix: ' (1/2)',
      },
      {
        index: 2,
        totalParcels: 2,
        amount: 0,
        referenceMonth: '2025-07',
        descriptionSuffix: ' (2/2)',
      },
    ];

    const { getAllByText, queryByTestId } = render(
      <InstallmentPreview
        installments={installmentsNoAmount}
        locale="en-US"
        transactionType="expense"
        testID="preview"
      />
    );
    // Should show hint text instead of AmountDisplay
    const hints = getAllByText('Enter the total amount to see values');
    expect(hints).toHaveLength(2);
    // AmountDisplay should not be rendered
    expect(queryByTestId('preview-amount-1')).toBeNull();
    expect(queryByTestId('preview-amount-2')).toBeNull();
  });

  it('uses correct testID prefix', () => {
    const { getByTestId } = render(
      <InstallmentPreview
        installments={baseInstallments}
        locale="en-US"
        transactionType="income"
        testID="custom-preview"
      />
    );
    expect(getByTestId('custom-preview')).toBeTruthy();
    expect(getByTestId('custom-preview-item-1')).toBeTruthy();
  });
});
