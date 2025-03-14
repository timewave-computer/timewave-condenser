/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['*.ts', '!dist/**', '!node_modules/**'],
  coverageDirectory: 'coverage',
  verbose: true,
}; 