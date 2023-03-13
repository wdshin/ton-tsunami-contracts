export const IndexIds = {
  TON: 1,
  BTC: 2,
  EUR: 3,
  TSLA: 4,
};

export function configTypeByIndexName(name: keyof typeof IndexIds) {
  switch (name) {
    case 'TON':
    case 'BTC':
      return 'crypto';
    default:
      return 'forex';
  }
}
