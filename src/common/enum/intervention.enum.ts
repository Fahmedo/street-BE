export enum InterventionType {
  PHONE_CALL = 'phone-call',
  HOME_VISIT = 'home-visit',
  MEETING = 'meeting',
  OTHER = 'other',
}

export enum InterventionCategory {
  BEHAVIORAL = 'behavioral',
  ACADEMIC = 'academic',
  ATTENDANCE = 'attendance',
  WELLBEING = 'wellbeing',
  OTHER = 'other',
}

export enum InterventionStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled', 
}

export enum InterventionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}
