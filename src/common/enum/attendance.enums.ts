export enum AttendanceMode {
  NFC = 'NFC',
  PHOTO = 'PHOTO',
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  GPS = 'GPS',
  FACE_RECOGNITION = 'FACE_RECOGNITION'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum GpsValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
  FAILED = 'FAILED',
  OUTSIDE_RADIUS = 'OUTSIDE_RADIUS',
  NO_GPS = 'NO_GPS',
  GPS_DISABLED = 'GPS_DISABLED',
}
export enum AttendanceSyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
}

export enum AttendanceDateRange {
  TODAY = 'today',
  LAST_7_DAYS = 'last-7-days',
  LAST_30_DAYS = 'last-30-days',
  THIS_MONTH = 'this-month',
}

export enum DeviceType {
  ANDROID = 'android',
  IOS     = 'ios',
  WEB     = 'web',
  UNKNOWN = 'unknown',
}