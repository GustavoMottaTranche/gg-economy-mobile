/**
 * Unit tests for weeklyRecurringStore expansion state
 *
 * Tests the expandedGroupIds state, toggleGroupExpansion, and collapseAllGroups actions.
 * Validates: Requirements 1.3, 1.4
 */
import { useWeeklyRecurringStore } from '../weeklyRecurringStore';

describe('weeklyRecurringStore - expansion state', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWeeklyRecurringStore.setState({
      expandedGroupIds: new Set<string>(),
    });
  });

  describe('initial state', () => {
    it('should have an empty expandedGroupIds set', () => {
      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds).toBeInstanceOf(Set);
      expect(state.expandedGroupIds.size).toBe(0);
    });
  });

  describe('toggleGroupExpansion', () => {
    it('should add a group ID when it is not expanded', () => {
      const { toggleGroupExpansion } = useWeeklyRecurringStore.getState();

      toggleGroupExpansion('group-1');

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.has('group-1')).toBe(true);
      expect(state.expandedGroupIds.size).toBe(1);
    });

    it('should remove a group ID when it is already expanded', () => {
      useWeeklyRecurringStore.setState({
        expandedGroupIds: new Set(['group-1']),
      });

      const { toggleGroupExpansion } = useWeeklyRecurringStore.getState();
      toggleGroupExpansion('group-1');

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.has('group-1')).toBe(false);
      expect(state.expandedGroupIds.size).toBe(0);
    });

    it('should handle multiple groups independently', () => {
      const { toggleGroupExpansion } = useWeeklyRecurringStore.getState();

      toggleGroupExpansion('group-1');
      toggleGroupExpansion('group-2');

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.has('group-1')).toBe(true);
      expect(state.expandedGroupIds.has('group-2')).toBe(true);
      expect(state.expandedGroupIds.size).toBe(2);
    });

    it('should only collapse the toggled group, leaving others expanded', () => {
      useWeeklyRecurringStore.setState({
        expandedGroupIds: new Set(['group-1', 'group-2', 'group-3']),
      });

      const { toggleGroupExpansion } = useWeeklyRecurringStore.getState();
      toggleGroupExpansion('group-2');

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.has('group-1')).toBe(true);
      expect(state.expandedGroupIds.has('group-2')).toBe(false);
      expect(state.expandedGroupIds.has('group-3')).toBe(true);
      expect(state.expandedGroupIds.size).toBe(2);
    });
  });

  describe('collapseAllGroups', () => {
    it('should clear all expanded group IDs', () => {
      useWeeklyRecurringStore.setState({
        expandedGroupIds: new Set(['group-1', 'group-2', 'group-3']),
      });

      const { collapseAllGroups } = useWeeklyRecurringStore.getState();
      collapseAllGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.size).toBe(0);
    });

    it('should be a no-op when no groups are expanded', () => {
      const { collapseAllGroups } = useWeeklyRecurringStore.getState();
      collapseAllGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.expandedGroupIds.size).toBe(0);
    });
  });
});
