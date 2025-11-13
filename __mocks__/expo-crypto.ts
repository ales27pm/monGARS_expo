export async function getRandomBytesAsync(size: number): Promise<Uint8Array> {
  const buffer = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    buffer[i] = (i * 17 + 31) % 255;
  }
  return buffer;
}

export default {
  getRandomBytesAsync,
};
