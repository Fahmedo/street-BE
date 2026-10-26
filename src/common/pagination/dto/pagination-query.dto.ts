import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'perPage must be an integer' })
  @Min(10, { message: 'Page must be greater than or equal to 1' })
  @Max(100, { message: 'perPage must be less than or equal to 100' })
  perPage?: number = 10;

  @IsOptional()
  @Type(() => String)
  category?: string;

  @IsOptional()
  @Type(() => String)
  searchTerm?: string;

  @IsOptional()
  @Type(() => String)
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter results by state',
    example: 'Lagos',
  })
  @IsOptional()
  @Type(() => String)
  state?: string;

 @ApiPropertyOptional({
    description: 'Filter results by country',
    example: 'Nigeria',
  })
  @IsOptional()
  @Type(() => String)
  country?: string;


 @ApiPropertyOptional({
    description: 'Filter results by town',
    example: 'Bali',
  })
  @IsOptional()
  @Type(() => String)
  town?: string;


  @ApiPropertyOptional({
    description: 'Filter results by Local Government Area (LGA)',
    example: 'Ikeja',
  })
  @IsOptional()
  @Type(() => String)
  city?: string;

  @IsOptional()
  @Type(() => String)
  role?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn(['createdAt', 'firstName', 'lastName'])
  sortBy?: 'createdAt' | 'firstName' | 'lastName';

  @IsOptional()
  @Type(() => String)
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
