import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type PropertyDocument = HydratedDocument<Property>;
@Schema({ _id: false })
export class BookingRequest {
  @Prop({ required: true }) _id!: string;
  @Prop({ required: true }) clientId!: string;
  @Prop({ required: true }) clientUsername!: string;
  @Prop({ required: true }) fromDate!: string;
  @Prop({ required: true }) toDate!: string;
  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'] }) status!: 'pending' | 'approved' | 'rejected';
  @Prop({ required: true }) createdAt!: string;
  @Prop() reviewedBy?: string;
  @Prop() reviewedAt?: string;
}
const BookingRequestSchema = SchemaFactory.createForClass(BookingRequest);
@Schema({ timestamps: true, collection: 'properties' })
export class Property {
  @Prop({ default: false }) deleted!: boolean;
  @Prop({ type: [BookingRequestSchema], default: [] }) bookingRequests!: BookingRequest[];
  @Prop({ index: true }) ownerId?: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ required: true, trim: true }) address!: string;
  @Prop({ required: true, min: 1 }) rent!: number;
  @Prop({ required: true, min: 0 }) bedrooms!: number;
  @Prop({ default: '', trim: true }) description!: string;
  @Prop({ default: true }) available!: boolean;
}
export const PropertySchema = SchemaFactory.createForClass(Property);
