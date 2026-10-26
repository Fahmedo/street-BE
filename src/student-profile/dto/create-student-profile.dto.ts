import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  Length,
  IsObject,
  IsEnum,
} from 'class-validator';

export class CreateStudentProfileDto {
  @IsString()
  schoolId: string;

  @IsString()
  classId: string;

  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  middleName?: string;          // was otherName

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;       // was guardianContact

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  homeAddress?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;  

  @IsDateString()
  @IsOptional()
  enrollmentDate?: Date;

}