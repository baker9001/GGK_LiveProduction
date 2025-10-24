type SupabaseMock = {
  from?: (table: string) => unknown;
  storageFrom?: () => unknown;
};

const globalRef = globalThis as typeof globalThis & { __supabaseMock?: SupabaseMock };

export const supabase = {
  from(table: string) {
    const mock = globalRef.__supabaseMock;
    if (!mock || typeof mock.from !== 'function') {
      throw new Error(`supabase mock not configured for table ${table}`);
    }
    return mock.from(table);
  },
  storage: {
    from() {
      const mock = globalRef.__supabaseMock;
      if (!mock || typeof mock.storageFrom !== 'function') {
        throw new Error('supabase storage mock not configured');
      }
      return mock.storageFrom();
    }
  }
};
