export const STATUS_OPTIONS = ['active', 'inactive'] as const;
export type StatusType = (typeof STATUS_OPTIONS)[number];

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;