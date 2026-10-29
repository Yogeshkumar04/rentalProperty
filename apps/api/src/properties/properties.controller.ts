import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './property.dto';
import { AuthGuard } from '../auth/auth.module';
@Controller('properties')
@UseGuards(AuthGuard)
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}
  @Get() findAll() { return this.properties.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.properties.findOne(id); }
  @Post() create(@Body() dto: CreatePropertyDto, @Req() req: any) { return this.properties.create(dto, req.user); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @Req() req: any) { return this.properties.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: any) { return this.properties.remove(id, req.user); }
}
