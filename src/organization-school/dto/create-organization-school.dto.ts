import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddSchoolToOrganizationDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;
}