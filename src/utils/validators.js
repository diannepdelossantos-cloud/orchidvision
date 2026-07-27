// Shared validation rules used across the Sign In, Create Account, and
// Forgot Password forms (kept in one place so the rules stay consistent).
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPassword(value) {
  return value.length >= 8;
}
