import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SchoolType } from '../../common/enum/school-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Greenfield Primary School' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '12 Allen Avenue, Ikeja' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: SchoolType, example: SchoolType.PRIMARY })
  @IsEnum(SchoolType)
  @IsOptional()
  schoolType?: SchoolType;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  
  @ApiPropertyOptional({ example: 'Bali' })
  @IsOptional()
  @IsString()
  town?: string;

  @ApiPropertyOptional({ example: 'Ikeja' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 6.6018, description: 'Latitude coordinate' })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.3515, description: 'Longitude coordinate' })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 200, description: 'Radius in meters' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(10)
  radiusMeters?: number = 200;

  @ApiPropertyOptional({ example: 'Mr Ade' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.app.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: { NFC: true, PHOTO: true, MANUAL: false },
    description: 'Attendance modes configuration',
  })
  @IsOptional()
  @IsObject()
  attendanceModes?: Record<string, boolean>;
}