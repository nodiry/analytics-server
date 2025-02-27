export const generateUniqueKey = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).slice(0, 8); // Convert to base36 and take 8 chars
  };

export const generatePasscode = (): number => {
  return Math.floor(100000 + Math.random() * 900000);
};

  