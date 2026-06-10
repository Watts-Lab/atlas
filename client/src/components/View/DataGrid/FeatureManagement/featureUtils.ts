export const generateTrail = (identifier: string): string => {
  // Remove .parent suffix for display, then replace dots with arrows
  const cleanIdentifier = identifier.endsWith('.parent')
    ? identifier.replace('.parent', '[ ]')
    : identifier
  return cleanIdentifier.replace(/\./g, ' → ')
}
