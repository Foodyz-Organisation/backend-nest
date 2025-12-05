import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/Signup.dto';
import { ProfessionalSignupDto } from './dto/ProfessionalSignup.dto';
import { LoginDto } from './dto/Login.dto';
import { ForgotPasswordDto } from './dto/ForgotPassword.dto';
import { VerifyOtpDto } from 'src/auth/dto/VerifyOtpDto';
import { ResetPasswordWithOtpDto } from 'src/auth/dto/ResetPassword.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

// ========== User Signup ==========
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @Post('signup/user')
  async userSignup(@Body() userData: SignupDto) {
    return this.authService.userSignup(userData);
  }

  // ========== Professional Signup ==========
  @ApiOperation({ summary: 'Register a new professional account' })
  @ApiResponse({ status: 201, description: 'Professional registered successfully' })
  @Post('signup/professional')
  async professionalSignup(@Body() profData: ProfessionalSignupDto) {
    return this.authService.professionalSignup(profData);
  }

  // ========== Shared Login ==========
  @Post('logout')
  async logout() {
  return this.authService.logout();
  }
  
  @ApiOperation({ summary: 'Login for users and professionals' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Post('login')
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }


  @ApiOperation({ summary: 'Send OTP code to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendOtp(dto.email);
  }

  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified, reset token generated' })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordWithOtpDto) {
    return this.authService.resetPassword(dto.email, dto.resetToken, dto.newPassword);
  }
}