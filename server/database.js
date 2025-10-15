/**
 * Database Module
 * This module re-exports the DatabaseAdapter which supports both SQLite and PostgreSQL
 * The actual implementation is in databaseAdapter.js
 */

const databaseAdapter = require('./databaseAdapter');

// Re-export all methods from the adapter for backward compatibility
module.exports = databaseAdapter;

