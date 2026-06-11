import { CloudSyncError, CloudSyncErrorCode } from '../CloudSyncError';

describe('CloudSyncError', () => {
  it('should create an error with code and message', () => {
    const error = new CloudSyncError('Invalid credentials', 'AUTH_FAILED');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CloudSyncError);
    expect(error.message).toBe('Invalid credentials');
    expect(error.code).toBe('AUTH_FAILED');
    expect(error.name).toBe('CloudSyncError');
    expect(error.httpStatus).toBeUndefined();
  });

  it('should create an error with optional httpStatus', () => {
    const error = new CloudSyncError('Server error', 'SERVER_ERROR', 500);

    expect(error.message).toBe('Server error');
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.httpStatus).toBe(500);
  });

  it('should support all defined error codes', () => {
    const codes: CloudSyncErrorCode[] = [
      'AUTH_FAILED',
      'NETWORK_ERROR',
      'EXTRACTION_FAILED',
      'PAYLOAD_ERROR',
      'IMPORT_FAILED',
      'NOT_CONFIGURED',
      'SERVER_ERROR',
      'ALREADY_RUNNING',
    ];

    for (const code of codes) {
      const error = new CloudSyncError(`Error: ${code}`, code);
      expect(error.code).toBe(code);
    }
  });

  it('should have a proper stack trace', () => {
    const error = new CloudSyncError('Network failed', 'NETWORK_ERROR');

    expect(error.stack).toBeDefined();
  });
});
