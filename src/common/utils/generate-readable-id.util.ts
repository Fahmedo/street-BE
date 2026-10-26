export function generateStudentCode(schoolPart: string): string {
  const year = new Date().getFullYear();
  const part = schoolPart
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase(); // ← 5 not 4
  const random = Math.floor(1000 + Math.random() * 9000); // ← 4 digit number e.g. 47382
  return `STU-${year}-${part}-${random}`;
}

export function generateSchoolCode(
  schoolName: string,
  orgShortCode: string,
): string {
  const orgPart = orgShortCode
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  const schoolPart = schoolName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCH-${orgPart}-${schoolPart}-${random}`;
}
export function generateGlobalSchoolCode(schoolName: string): string {
  const clean = schoolName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCH-${clean}-${suffix}`;
}