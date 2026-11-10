module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      { configFile: require.resolve('../../scripts/testing/babel.cjs') },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@talkentry/core$': '<rootDir>/../core/src/index.ts',
    '^@test/(.*)$': '<rootDir>/../../test-support/$1',
  },
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/support/setup.ts'],
};
