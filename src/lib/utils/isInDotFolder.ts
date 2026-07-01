export const isInDotFolder = (filePath: string): boolean =>
    filePath.split(/[\\/]/).some(s => s.startsWith('.') && s.length > 1 && s !== '..');
