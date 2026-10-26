// src/common/helpers/email.helper.ts
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// Or with a fixed start year
export const getCopyrightText = (startYear?: number): string => {
  const currentYear = new Date().getFullYear();
  if (startYear && startYear < currentYear) {
    return `&copy; ${startYear}-${currentYear} Street To School. All rights reserved.`;
  }
  return `&copy; ${currentYear} Street To School. All rights reserved.`;
};