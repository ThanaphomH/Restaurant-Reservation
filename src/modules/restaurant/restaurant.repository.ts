import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from 'src/modules/restaurant/schema/restaurant.schema';

@Injectable()
export class RestaurantRepository {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  async getModel(): Promise<Model<RestaurantDocument>> {
    return this.restaurantModel;
  }

  async getAll(): Promise<RestaurantDocument[]> {
    return this.restaurantModel.find().exec();
  }

  async getById(id: Types.ObjectId): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async create(restaurant: Partial<Restaurant>): Promise<RestaurantDocument> {
    try {
      const newRestaurant = new this.restaurantModel(restaurant);
      return await newRestaurant.save();
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error code
        throw new BadRequestException('Restaurant name is already in use.');
      }
      throw new InternalServerErrorException('Failed to create restaurant');
    }
  }

  async update(
    id: Types.ObjectId,
    restaurant: Partial<Restaurant>,
  ): Promise<RestaurantDocument> {
    try {
      const updatedRestaurant = await this.restaurantModel
        .findByIdAndUpdate(id, restaurant, { new: true })
        .exec();
      if (!updatedRestaurant) {
        throw new NotFoundException('Restaurant not found');
      }
      return updatedRestaurant;
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error code
        throw new BadRequestException('Restaurant name is already in use.');
      }
      throw new InternalServerErrorException('Failed to create restaurant');
    }
  }

  async delete(id: Types.ObjectId): Promise<RestaurantDocument> {
    const deletedRestaurant = await this.restaurantModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedRestaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return deletedRestaurant;
  }
}
