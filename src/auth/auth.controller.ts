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
@Post('signup/user')
async userSignup(@Body() userData: SignupDto) {
  console.log('Received user signup data:', userData); // <-- ADD THIS
  return this.authService.userSignup(userData);
}

// ========== Professional Signup ==========
@Post('signup/professional')
async professionalSignup(@Body() profData: ProfessionalSignupDto) {
  console.log('Received professional signup data:', profData); // <-- ADD THIS
  return this.authService.professionalSignup(profData);
}

// ========== Shared Login ==========
@Post('login')
async login(@Body() loginData: LoginDto) {
  console.log('Received login data:', loginData); // <-- ADD THIS
  return this.authService.login(loginData);
}


    @Post('logout')
  async logout() {
    return this.authService.logout();
  }
}
