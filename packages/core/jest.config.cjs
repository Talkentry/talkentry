module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['babel-jest', { configFile: require.resolve('../../scripts/testing/babel.cjs') }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@talkentry/core$': '<rootDir>/src/index.ts',
    '^@test/(.*)$': '<rootDir>/../../test-support/$1',
  },
  clearMocks: true,
  restoreMocks: true,
};
