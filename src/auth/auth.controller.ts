import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/Signup.dto';
import { ProfessionalSignupDto } from './dto/ProfessionalSignup.dto';
import { LoginDto } from './dto/Login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========== User Signup ==========
  @ApiOperation({ summary: 'Register a new user account' })
  @Post('signup/user')
  async userSignup(@Body() userData: SignupDto) {
    return this.authService.userSignup(userData);
  }

  // ========== Professional Signup ==========
  @ApiOperation({ summary: 'Register a new professional account' })
  @Post('signup/professional')
  async professionalSignup(@Body() profData: ProfessionalSignupDto) {
    return this.authService.professionalSignup(profData);
  }

  // ========== Shared Login ==========
  @ApiOperation({ summary: 'Login for users and professionals' })
  @Post('login')
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }
}
