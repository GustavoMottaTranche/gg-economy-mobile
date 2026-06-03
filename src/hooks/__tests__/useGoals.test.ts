/**
 * useGoals Hook Tests
 *
 * Tests for the useGoals hook that exposes goal data from goalStore
 * and computes expectedFutureSpending using the calculation service.
 *
 * **Validates: Requirements 3.1, 4.1, 10.1**
 */
import { renderHook, act } from '@testing-library/react-native';
import { useGoals } from '../useGoals';
import { useGoalStore } from '../../stores/goalStore';

describe('useGoals', () => {
  beforeEach(() => {
    // Reset goal store to initial state
    useGoalStore.setState({
      generalGoal: null,
      categoryGoals: new Map<string, number>(),
      isLoading: false,
    });
  });

  it('should return null generalGoal when no goal is configured', () => {
    const { result } = renderHook(() => useGoals());

    expect(result.current.generalGoal).toBeNull();
  });

  it('should return the generalGoal from the store', () => {
    useGoalStore.setState({ generalGoal: 250000 });

    const { result } = renderHook(() => useGoals());

    expect(result.current.generalGoal).toBe(250000);
  });

  it('should return categoryGoals from the store', () => {
    const goals = new Map<string, number>();
    goals.set('cat-1', 50000);
    goals.set('cat-2', 75000);
    useGoalStore.setState({ categoryGoals: goals });

    const { result } = renderHook(() => useGoals());

    expect(result.current.categoryGoals.get('cat-1')).toBe(50000);
    expect(result.current.categoryGoals.get('cat-2')).toBe(75000);
  });

  it('should return isLoading from the store', () => {
    useGoalStore.setState({ isLoading: true });

    const { result } = renderHook(() => useGoals());

    expect(result.current.isLoading).toBe(true);
  });

  it('should compute expectedFutureSpending as 0 when no spending data is provided', () => {
    const { result } = renderHook(() => useGoals());

    expect(result.current.expectedFutureSpending).toBe(0);
  });

  it('should compute expectedFutureSpending as 0 when no category goals are configured', () => {
    const spending = [
      { categoryId: 'cat-1', actualSpending: 30000 },
      { categoryId: 'cat-2', actualSpending: 50000 },
    ];

    const { result } = renderHook(() => useGoals(spending));

    expect(result.current.expectedFutureSpending).toBe(0);
  });

  it('should compute expectedFutureSpending based on goals and spending', () => {
    const goals = new Map<string, number>();
    goals.set('cat-1', 100000); // goal: 1000.00
    goals.set('cat-2', 80000); // goal: 800.00
    useGoalStore.setState({ categoryGoals: goals });

    const spending = [
      { categoryId: 'cat-1', actualSpending: 30000 }, // spent 300, remaining 700
      { categoryId: 'cat-2', actualSpending: 50000 }, // spent 500, remaining 300
    ];

    const { result } = renderHook(() => useGoals(spending));

    // (100000 - 30000) + (80000 - 50000) = 70000 + 30000 = 100000
    expect(result.current.expectedFutureSpending).toBe(100000);
  });

  it('should contribute 0 for categories where spending exceeds goal', () => {
    const goals = new Map<string, number>();
    goals.set('cat-1', 50000); // goal: 500.00
    goals.set('cat-2', 80000); // goal: 800.00
    useGoalStore.setState({ categoryGoals: goals });

    const spending = [
      { categoryId: 'cat-1', actualSpending: 60000 }, // exceeded: contributes 0
      { categoryId: 'cat-2', actualSpending: 30000 }, // remaining 500
    ];

    const { result } = renderHook(() => useGoals(spending));

    // max(0, 50000 - 60000) + max(0, 80000 - 30000) = 0 + 50000 = 50000
    expect(result.current.expectedFutureSpending).toBe(50000);
  });

  it('should exclude categories without goals from expectedFutureSpending', () => {
    const goals = new Map<string, number>();
    goals.set('cat-1', 100000);
    // cat-2 has no goal
    useGoalStore.setState({ categoryGoals: goals });

    const spending = [
      { categoryId: 'cat-1', actualSpending: 40000 },
      { categoryId: 'cat-2', actualSpending: 90000 },
    ];

    const { result } = renderHook(() => useGoals(spending));

    // Only cat-1 contributes: max(0, 100000 - 40000) = 60000
    expect(result.current.expectedFutureSpending).toBe(60000);
  });

  it('should contribute full goal amount when category has zero spending', () => {
    const goals = new Map<string, number>();
    goals.set('cat-1', 75000);
    useGoalStore.setState({ categoryGoals: goals });

    const spending = [{ categoryId: 'cat-1', actualSpending: 0 }];

    const { result } = renderHook(() => useGoals(spending));

    expect(result.current.expectedFutureSpending).toBe(75000);
  });

  it('should reactively update when store state changes', () => {
    const spending = [{ categoryId: 'cat-1', actualSpending: 20000 }];

    const { result } = renderHook(() => useGoals(spending));

    expect(result.current.expectedFutureSpending).toBe(0);
    expect(result.current.generalGoal).toBeNull();

    act(() => {
      const goals = new Map<string, number>();
      goals.set('cat-1', 50000);
      useGoalStore.setState({ generalGoal: 200000, categoryGoals: goals });
    });

    expect(result.current.generalGoal).toBe(200000);
    expect(result.current.expectedFutureSpending).toBe(30000);
  });
});
