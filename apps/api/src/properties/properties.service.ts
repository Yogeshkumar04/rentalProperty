import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Property } from './property.schema';
import { CreatePropertyDto, UpdatePropertyDto } from './property.dto';
@Injectable()
export class PropertiesService {
  constructor(@InjectModel(Property.name) private readonly model: Model<Property>) {}
  findAll() { return this.model.find({ deleted: { $ne: true } }).select('-bookingRequests -deleted').sort({ createdAt: -1 }).lean().exec(); }
  create(dto: CreatePropertyDto, user: any) { this.authorize(user); return this.model.create({ ...dto, ownerId: user._id }).then(property => { const { bookingRequests, deleted, ...result } = property.toObject(); return result; }); }
  private authorize(user: any, property?: any) { if (user.role !== 'admin' && (user.role !== 'landlord' || (property && property.ownerId !== user._id))) throw new ForbiddenException('You cannot manage this property'); }
  private checkId(id: string) { if (!isValidObjectId(id)) throw new BadRequestException('Invalid property ID'); }
  async findOne(id: string) {
    this.checkId(id);
    const property = await this.model.findOne({ _id: id, deleted: { $ne: true } }).select('-bookingRequests -deleted').lean().exec();
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
  async update(id: string, dto: UpdatePropertyDto, user: any) {
    this.authorize(user, await this.findOne(id));
    this.checkId(id);
    const property = await this.model.findOneAndUpdate({ _id: id, deleted: { $ne: true } }, dto, { new: true, runValidators: true }).select('-bookingRequests -deleted').exec();
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
  async remove(id: string, user: any) {
    this.authorize(user, await this.findOne(id));
    this.checkId(id);
    if (!await this.model.findOneAndUpdate({ _id: id, deleted: { $ne: true } }, { $set: { deleted: true, available: false } }).exec()) throw new NotFoundException('Property not found');
    return { message: 'Property deleted' };
  }
}
