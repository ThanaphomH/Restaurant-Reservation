import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CookieOptions, Response } from 'express';
import { Types } from 'mongoose';
import { Role } from 'src/common/enum';
import { OtpVerificationRepository } from 'src/modules/otp/otp.repository';
import {
  OTPRequest,
  RegisterRequest,
} from 'src/modules/user/dto/request-user.dto';
import { TokenResponse } from 'src/modules/user/dto/response-user.dto';
import { UserDocument } from 'src/modules/user/schema/user.schema';
import { UserRepository } from 'src/modules/user/user.repository';
import { TwilioService } from 'src/modules/twilio/twilio.service';

@Injectable()
export class UserService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly otpVerificationRepository: OtpVerificationRepository,
    private readonly twilioService: TwilioService,
  ) {}

  async getById(id: Types.ObjectId): Promise<UserDocument> {
    return this.userRepository.getById(id);
  }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    try {
      const user = await this.getByEmail(email);

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async createUser(req: RegisterRequest) {
    const userModel = await this.userRepository.getModel();
    const userReq = new userModel(req);
    const otp = await this.otpVerificationRepository.create(userReq._id);
    const user = await this.userRepository.create(userReq);

    const message = `Hi ${user.username}, welcome! Please verify your account by entering this code: ${otp.otp}.`;
    await this.twilioService.sendSms(user.phone, message);
    return { user, otp };
  }

  async getByEmail(email: string): Promise<UserDocument> {
    const user = await this.userRepository.getByEmail(email);
    return user;
  }

  async generateToken(user: UserDocument): Promise<TokenResponse> {
    const payload = { email: user.email, sub: user._id };
    const tokenRes: TokenResponse = {
      token: this.jwtService.sign(payload),
    };
    return tokenRes;
  }

  async verifyUser(
    otpReq: OTPRequest,
    user: UserDocument,
  ): Promise<UserDocument> {
    const otpVerification = await this.otpVerificationRepository.getByUserId(
      user._id,
    );
    if (!otpVerification) {
      throw new NotFoundException('OTP not found');
    }

    if (otpReq.otp !== otpVerification.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    const currentTime = new Date(Date.now());
    if (currentTime > otpVerification.expiredAt) {
      throw new UnauthorizedException('OTP expired');
    }

    const res = await this.userRepository.update(user._id, { role: Role.USER });
    await this.otpVerificationRepository.delete(otpVerification._id);
    return res;
  }

  async resentOtp(user: UserDocument): Promise<void> {
    try {
      await this.otpVerificationRepository.refresh(user._id);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to refresh OTP');
    }
  }

  async setCookie(
    res: Response,
    name: string,
    value: string,
    options: CookieOptions = {},
  ): Promise<void> {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      ...options,
    };

    res.cookie(name, value, defaultOptions);
  }

  async removeCookie(
    res: Response,
    name: string,
    options: CookieOptions = {},
  ): Promise<void> {
    const defaultOptions: CookieOptions = {
      path: '/',
      ...options,
    };

    res.clearCookie(name, defaultOptions);
  }

  async deleteUser(id: Types.ObjectId): Promise<UserDocument> {
    return this.userRepository.delete(id);
  }
}
