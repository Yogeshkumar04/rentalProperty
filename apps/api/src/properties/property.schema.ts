import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type PropertyDocument = HydratedDocument<Property>;
@Schema({ timestamps: true, collection: 'properties' })
export class Property {
  @Prop({ index: true }) ownerId?: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ required: true, trim: true }) address!: string;
  @Prop({ required: true, min: 1 }) rent!: number;
  @Prop({ required: true, min: 0 }) bedrooms!: number;
  @Prop({ default: '', trim: true }) description!: string;
  @Prop({ default: true }) available!: boolean;
}
export const PropertySchema = SchemaFactory.createForClass(Property);
