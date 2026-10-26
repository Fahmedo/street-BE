import {
  IsEmail, IsEnum, IsArray, ArrayMinSize,
  IsNotEmpty, IsOptional, IsString, IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enum/roles.enum';
import { OrganizationStatus } from '../../common/enum/organization-status';

export class CreateOrganizationUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
   @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

    @IsOptional()
    @IsString()
    address?: string;
  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.ACTIVE })
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.SCHOOL_ADMIN, Role.MENTOR] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles: Role[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  schoolIds?: string[];
}