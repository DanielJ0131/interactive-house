jest.mock('../../utils/firebaseConfig', () => ({
  auth: {},
  db: {},
}));

describe('firebaseConfig', () => {
  it('should be mocked correctly', () => {
    const config = require('../../utils/firebaseConfig');

    expect(config).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.db).toBeDefined();
  });
});