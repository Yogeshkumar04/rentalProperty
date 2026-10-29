import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
export class CreatePropertyDto {
  @IsString() @IsNotEmpty() @MaxLength(120) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(250) address!: string;
  @IsNumber() @Min(1) @Max(100000000) rent!: number;
  @IsInt() @Min(0) @Max(50) bedrooms!: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsBoolean() available?: boolean;
}
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
