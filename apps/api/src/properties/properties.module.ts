import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './property.schema';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
@Module({ imports: [MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }])], controllers: [PropertiesController], providers: [PropertiesService] })
export class PropertiesModule {}
