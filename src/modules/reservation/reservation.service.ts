import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CreateReservationRequest,
  UpdateReservationRequest,
} from 'src/modules/reservation/dto/request-reservation.dto';
import { ReservationRepository } from 'src/modules/reservation/reservation.repository';
import { Reservation } from 'src/modules/reservation/schema/reservation.schema';
import { RestaurantRepository } from 'src/modules/restaurant/restaurant.repository';

@Injectable()
export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly restaurantRepository: RestaurantRepository,
  ) {}

  async getReservationById(reservationId: string) {
    const reservationObjectId = new Types.ObjectId(reservationId);
    return this.reservationRepository.getById(reservationObjectId);
  }

  async getOwnedReservations(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return this.reservationRepository.getAllOwned(userObjectId);
  }

  async getAllReservations() {
    return this.reservationRepository.getAll();
  }

  async createReservation(reservation: CreateReservationRequest) {
    return this.reservationRepository.create(reservation);
  }

  async updateReservation(
    reservationId: string,
    reservation: UpdateReservationRequest,
  ) {
    const reservationObjectId = new Types.ObjectId(reservationId);
    return this.reservationRepository.update(reservationObjectId, reservation);
  }

  async deleteReservation(reservationId: string) {
    const reservationObjectId = new Types.ObjectId(reservationId);
    return this.reservationRepository.delete(reservationObjectId);
  }

  async checkIsExceedMaxSeats(
    restaurantId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
    seats: number,
  ) : Promise<boolean> {
    const restaurant = await this.restaurantRepository.getById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const maxSeats = restaurant.maxSeats;
    const availableSeats = await this.reservationRepository.countAvailableSeatsSlot(restaurant);

    let startTimeSlot : Date, endTimeSlot : Date;
    for (let i = 0; i < availableSeats.length - 1; i++) {
      startTimeSlot = availableSeats[i].time;
      endTimeSlot = availableSeats[i+1].time;

      // Check if the reservation time slot is intersecting with the available time slot
      if (startTime <= endTimeSlot && startTimeSlot < endTime) {
        if (availableSeats[i].seats + seats > maxSeats) {
          return true; 
        }
      }
    }
    return false; 
  }

  async isReservationOnGoing(reservationId: string): Promise<boolean> {
    const reservationObjectId = new Types.ObjectId(reservationId);
    const reservation = await this.reservationRepository.getById(reservationObjectId);
    const currentTime = new Date();
    return reservation.startTime <= currentTime && reservation.endTime >= currentTime;
  }

  async findByStartTimeRange(start: Date, end: Date): Promise<Reservation[]> {
    return this.reservationRepository.findByStartTimeRange(start, end);
  }

  async markReminderSent(id: Types.ObjectId) {
    await this.reservationRepository.markReminderSent(id);
  }
}
