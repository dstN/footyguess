export function chunkArray<T>(array: T[], chunkCount = 5): T[][] {
  const result: T[][] = [];
  const chunkSize = Math.ceil(array.length / chunkCount);

  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    result.push(array.slice(start, end));
  }

  return result;
}
