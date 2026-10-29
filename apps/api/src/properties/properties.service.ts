import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Property } from './property.schema';
import { CreatePropertyDto, UpdatePropertyDto } from './property.dto';
@Injectable()
export class PropertiesService {
  constructor(@InjectModel(Property.name) private readonly model: Model<Property>) {}
  findAll() { return this.model.find().sort({ createdAt: -1 }).lean().exec(); }
  create(dto: CreatePropertyDto, user: any) { this.authorize(user); return this.model.create({ ...dto, ownerId: user._id }); }
  private authorize(user: any, property?: any) { if (user.role !== 'admin' && (user.role !== 'landlord' || (property && property.ownerId !== user._id))) throw new ForbiddenException('You cannot manage this property'); }
  private checkId(id: string) { if (!isValidObjectId(id)) throw new BadRequestException('Invalid property ID'); }
  async findOne(id: string) {
    this.checkId(id);
    const property = await this.model.findById(id).lean().exec();
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
  async update(id: string, dto: UpdatePropertyDto, user: any) {
    this.authorize(user, await this.findOne(id));
    this.checkId(id);
    const property = await this.model.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).exec();
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
  async remove(id: string, user: any) {
    this.authorize(user, await this.findOne(id));
    this.checkId(id);
    if (!await this.model.findByIdAndDelete(id).exec()) throw new NotFoundException('Property not found');
    return { message: 'Property deleted' };
  }
}
