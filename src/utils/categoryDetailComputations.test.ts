import {
  computeInstallmentIndex,
  computePaymentSummary,
  PaymentSummary,
  sortByPaymentStatusAndDate,
  CategoryDetailItem,
} from './categoryDetailComputations';

describe('computeInstallmentIndex', () => {
  it('returns correct 1-based index and total for a target found in the list', () => {
    const months = ['2024-01', '2024-02', '2024-03', '2024-04'];
    const result = computeInstallmentIndex(months, '2024-03');

    expect(result).toEqual({ currentIndex: 3, totalParcels: 4 });
  });

  it('returns currentIndex 1 when target is the first month', () => {
    const months = ['2024-01', '2024-02', '2024-03'];
    const result = computeInstallmentIndex(months, '2024-01');

    expect(result).toEqual({ currentIndex: 1, totalParcels: 3 });
  });

  it('returns currentIndex equal to length when target is the last month', () => {
    const months = ['2024-01', '2024-02', '2024-03'];
    const result = computeInstallmentIndex(months, '2024-03');

    expect(result).toEqual({ currentIndex: 3, totalParcels: 3 });
  });

  it('returns null when target month is not found in the list', () => {
    const months = ['2024-01', '2024-02', '2024-03'];
    const result = computeInstallmentIndex(months, '2024-05');

    expect(result).toBeNull();
  });

  it('returns null for an empty ordered months array', () => {
    const result = computeInstallmentIndex([], '2024-01');

    expect(result).toBeNull();
  });

  it('handles a single-element array correctly', () => {
    const months = ['2024-06'];
    const result = computeInstallmentIndex(months, '2024-06');

    expect(result).toEqual({ currentIndex: 1, totalParcels: 1 });
  });

  it('returns null for a single-element array when target does not match', () => {
    const months = ['2024-06'];
    const result = computeInstallmentIndex(months, '2024-07');

    expect(result).toBeNull();
  });

  it('works with non-consecutive months', () => {
    const months = ['2024-01', '2024-03', '2024-06', '2024-12'];
    const result = computeInstallmentIndex(months, '2024-06');

    expect(result).toEqual({ currentIndex: 3, totalParcels: 4 });
  });

  it('works with months spanning multiple years', () => {
    const months = ['2023-11', '2023-12', '2024-01', '2024-02'];
    const result = computeInstallmentIndex(months, '2024-01');

    expect(result).toEqual({ currentIndex: 3, totalParcels: 4 });
  });
});

describe('computePaymentSummary', () => {
  it('returns zeros for an empty list', () => {
    const result = computePaymentSummary([]);
    expect(result).toEqual<PaymentSummary>({
      paidTotal: 0,
      pendingTotal: 0,
      grandTotal: 0,
    });
  });

  it('sums abs(amount) for paid items into paidTotal', () => {
    const items = [
      { amount: -100, isPaid: true },
      { amount: -250, isPaid: true },
    ];
    const result = computePaymentSummary(items);
    expect(result.paidTotal).toBe(350);
    expect(result.pendingTotal).toBe(0);
    expect(result.grandTotal).toBe(350);
  });

  it('sums abs(amount) for unpaid items into pendingTotal', () => {
    const items = [
      { amount: -50, isPaid: false },
      { amount: -75, isPaid: false },
    ];
    const result = computePaymentSummary(items);
    expect(result.paidTotal).toBe(0);
    expect(result.pendingTotal).toBe(125);
    expect(result.grandTotal).toBe(125);
  });

  it('partitions items correctly into paid and pending', () => {
    const items = [
      { amount: -100, isPaid: true },
      { amount: -200, isPaid: false },
      { amount: -50, isPaid: true },
      { amount: -30, isPaid: false },
    ];
    const result = computePaymentSummary(items);
    expect(result.paidTotal).toBe(150);
    expect(result.pendingTotal).toBe(230);
    expect(result.grandTotal).toBe(380);
  });

  it('uses absolute value for positive amounts', () => {
    const items = [
      { amount: 100, isPaid: true },
      { amount: 200, isPaid: false },
    ];
    const result = computePaymentSummary(items);
    expect(result.paidTotal).toBe(100);
    expect(result.pendingTotal).toBe(200);
    expect(result.grandTotal).toBe(300);
  });

  it('handles zero amounts correctly', () => {
    const items = [
      { amount: 0, isPaid: true },
      { amount: 0, isPaid: false },
    ];
    const result = computePaymentSummary(items);
    expect(result).toEqual<PaymentSummary>({
      paidTotal: 0,
      pendingTotal: 0,
      grandTotal: 0,
    });
  });

  it('grandTotal always equals paidTotal + pendingTotal', () => {
    const items = [
      { amount: -1234, isPaid: true },
      { amount: -5678, isPaid: false },
      { amount: -910, isPaid: true },
    ];
    const result = computePaymentSummary(items);
    expect(result.grandTotal).toBe(result.paidTotal + result.pendingTotal);
  });
});

describe('sortByPaymentStatusAndDate', () => {
  const makeItem = (overrides: Partial<CategoryDetailItem>): CategoryDetailItem => ({
    id: '1',
    title: 'Test',
    date: '2024-01-15',
    amount: -100,
    type: 'transaction',
    isPaid: true,
    ...overrides,
  });

  it('returns an empty array for empty input', () => {
    const result = sortByPaymentStatusAndDate([]);
    expect(result).toEqual([]);
  });

  it('places paid items before pending items', () => {
    const items: CategoryDetailItem[] = [
      makeItem({ id: '1', isPaid: false, date: '2024-01-15' }),
      makeItem({ id: '2', isPaid: true, date: '2024-01-15' }),
      makeItem({ id: '3', isPaid: false, date: '2024-01-15' }),
      makeItem({ id: '4', isPaid: true, date: '2024-01-15' }),
    ];

    const result = sortByPaymentStatusAndDate(items);
    expect(result[0].isPaid).toBe(true);
    expect(result[1].isPaid).toBe(true);
    expect(result[2].isPaid).toBe(false);
    expect(result[3].isPaid).toBe(false);
  });

  it('sorts by date descending within the paid group', () => {
    const items: CategoryDetailItem[] = [
      makeItem({ id: '1', isPaid: true, date: '2024-01-10' }),
      makeItem({ id: '2', isPaid: true, date: '2024-01-20' }),
      makeItem({ id: '3', isPaid: true, date: '2024-01-15' }),
    ];

    const result = sortByPaymentStatusAndDate(items);
    expect(result.map((i) => i.date)).toEqual(['2024-01-20', '2024-01-15', '2024-01-10']);
  });

  it('sorts by date descending within the pending group', () => {
    const items: CategoryDetailItem[] = [
      makeItem({ id: '1', isPaid: false, date: '2024-01-05' }),
      makeItem({ id: '2', isPaid: false, date: '2024-01-25' }),
      makeItem({ id: '3', isPaid: false, date: '2024-01-10' }),
    ];

    const result = sortByPaymentStatusAndDate(items);
    expect(result.map((i) => i.date)).toEqual(['2024-01-25', '2024-01-10', '2024-01-05']);
  });

  it('does not mutate the original array', () => {
    const items: CategoryDetailItem[] = [
      makeItem({ id: '1', isPaid: false, date: '2024-01-20' }),
      makeItem({ id: '2', isPaid: true, date: '2024-01-10' }),
    ];
    const originalOrder = [...items];

    sortByPaymentStatusAndDate(items);

    expect(items[0].id).toBe(originalOrder[0].id);
    expect(items[1].id).toBe(originalOrder[1].id);
  });

  it('handles a single item', () => {
    const items: CategoryDetailItem[] = [makeItem({ id: '1', isPaid: true, date: '2024-01-15' })];
    const result = sortByPaymentStatusAndDate(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('handles mixed paid/pending with interleaved dates', () => {
    const items: CategoryDetailItem[] = [
      makeItem({ id: '1', isPaid: true, date: '2024-01-05' }),
      makeItem({ id: '2', isPaid: false, date: '2024-01-30' }),
      makeItem({ id: '3', isPaid: true, date: '2024-01-25' }),
      makeItem({ id: '4', isPaid: false, date: '2024-01-01' }),
    ];

    const result = sortByPaymentStatusAndDate(items);

    // Paid first, date descending
    expect(result[0]).toEqual(
      expect.objectContaining({ id: '3', isPaid: true, date: '2024-01-25' })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ id: '1', isPaid: true, date: '2024-01-05' })
    );
    // Pending next, date descending
    expect(result[2]).toEqual(
      expect.objectContaining({ id: '2', isPaid: false, date: '2024-01-30' })
    );
    expect(result[3]).toEqual(
      expect.objectContaining({ id: '4', isPaid: false, date: '2024-01-01' })
    );
  });
});
