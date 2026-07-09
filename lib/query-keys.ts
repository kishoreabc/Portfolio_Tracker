export const queryKeys = {
  sheets: ['sheets'] as const,
  sheetsForced: ['sheets', 'forced'] as const,
  insights: (hash: string) => ['insights', hash] as const,
} as const;
