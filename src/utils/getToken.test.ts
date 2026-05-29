/**
 * Unit tests for the getToken fallback utility.
 *
 * **Validates: Requirements 10.5, 10.6**
 */
import { getToken } from './getToken';

describe('getToken', () => {
  const tokenObj = {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#16A34A',
  };

  it('returns the value when the key exists', () => {
    expect(getToken(tokenObj, 'primary', '#000000')).toBe('#3B82F6');
    expect(getToken(tokenObj, 'secondary', '#000000')).toBe('#6B7280');
    expect(getToken(tokenObj, 'success', '#000000')).toBe('#16A34A');
  });

  it('returns the fallback when the key does not exist', () => {
    expect(getToken(tokenObj, 'nonexistent', '#FFFFFF')).toBe('#FFFFFF');
    expect(getToken(tokenObj, 'missing', 42 as any)).toBe(42);
  });

  it('logs a warning in __DEV__ mode when key is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    getToken(tokenObj, 'unknown', '#000');

    expect(warnSpy).toHaveBeenCalledWith(
      '[Theme] Token "unknown" not found, using fallback'
    );

    warnSpy.mockRestore();
  });

  it('does not warn when the key exists', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    getToken(tokenObj, 'primary', '#000');

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('works with numeric token objects', () => {
    const spacingTokens = { xs: 4, sm: 8, md: 12, base: 16 };

    expect(getToken(spacingTokens, 'md', 0)).toBe(12);
    expect(getToken(spacingTokens, 'huge', 64)).toBe(64);
  });

  it('handles empty string keys', () => {
    const obj = { '': 'empty-key-value' };
    expect(getToken(obj, '', 'fallback')).toBe('empty-key-value');
  });

  it('handles keys with value undefined correctly', () => {
    const obj: Record<string, string | undefined> = { key: undefined };
    // 'key' is in obj even if value is undefined
    expect(getToken(obj, 'key', 'fallback')).toBeUndefined();
  });
});
