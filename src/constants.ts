/**
 * Error codes for balar-lint diagnostics.
 *
 * These codes are in the 90xxx range to avoid collision with:
 * - TypeScript's built-in error codes (typically 1000-9999)
 * - Other TypeScript Language Server plugins
 */

/**
 * Error code for rule 1: Balar-wrapped functions must be called inside a balar.run() context
 */
export const BALAR_WRAPPED_OUTSIDE_CONTEXT = 90001;

/**
 * Error code for rule 2: Balar-wrapped functions must not be called conditionally inside balar.run()
 */
export const BALAR_WRAPPED_CONDITIONAL_CALL = 90002;
