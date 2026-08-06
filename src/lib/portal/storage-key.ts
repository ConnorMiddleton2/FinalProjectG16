/** Session-scoped portal storage keys — prevents cross-tenant local leakage. */
export function portalStorageKey(base: string, tenantScopeId: string): string {
  return `${base}::${tenantScopeId}`;
}
