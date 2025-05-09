import { Module } from "@nestjs/common";
import { RepositoryModule } from "src/database/repository.module";
import { RestaurantController } from "src/modules/restaurant/restaurant.controller";
import { RestaurantService } from "src/modules/restaurant/restaurant.service";

@Module({
  imports: [
    RepositoryModule
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}