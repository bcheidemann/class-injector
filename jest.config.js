/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: {
        exclude: process.env.DIAGNOSTICS_EXCLUDE
          ? [process.env.DIAGNOSTICS_EXCLUDE]
          : [],
      },
    },
  },
}
