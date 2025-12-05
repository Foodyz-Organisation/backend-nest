import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from '../professionalaccount/schema/professionalaccount.schema';
import { SignupDto } from './dto/Signup.dto';
import { ProfessionalSignupDto } from './dto/ProfessionalSignup.dto';
import { LoginDto } from './dto/Login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name) private profModel: Model<ProfessionalDocument>,
    private jwtService: JwtService,
  ) {}

  // ================= User Signup =================
  async userSignup(userData: SignupDto) {
    if (!userData.password) throw new Error('Password is required');

    const hashed = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      ...userData,
      password: hashed,
      role: 'user',
      isActive: true,
    });

    await newUser.save();
    return { message: 'User registered successfully' };
  }

  // ================= Professional Signup =================
async professionalSignup(profData: ProfessionalSignupDto) {
  if (!profData.password) throw new Error('Password is required');

  const hashed = await bcrypt.hash(profData.password, 10);

  // Map simple document strings → schema objects
  const mappedDocuments =
    profData.documents?.map((p) => ({
      filename: p,
      path: p,
      verified: false,
      ocrText: ''
    })) || [];

  const newProf = new this.profModel({
    email: profData.email,
    password: hashed,
    role: 'professional',
    isActive: true,

    // NEW CLEAN STRUCTURE
    fullName: profData.fullName || '',
    licenseNumber: profData.licenseNumber || '',
    documents: mappedDocuments,

    linkedUserId: profData.linkedUserId
      ? new Types.ObjectId(profData.linkedUserId)
      : undefined,
  });

  await newProf.save();

  return { message: 'Professional registered successfully' };
}



  // ================= Login (Access + Refresh Tokens) =================
  async login(loginData: LoginDto) {
    const { email, password } = loginData;

    // Try user account
    let account: UserDocument | ProfessionalDocument | null = await this.userModel.findOne({ email }).exec();
    let role: 'user' | 'professional' = 'user';

    // If not found, try professional account
    if (!account) {
      account = await this.profModel.findOne({ email }).exec();
      role = 'professional';
    }

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (!account.isActive) throw new UnauthorizedException('Account is deactivated');

    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: account._id, email: account.email, role };

    // Generate tokens
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' }); // short-lived
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' }); // long-lived

    return {
      access_token,
      refresh_token,
      role,
      email: account.email,
      id: account._id,
    };
  }

  // ================= Refresh Token =================
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email, role: payload.role },
        { expiresIn: '15m' },
      );
      return { access_token: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }


    async logout(): Promise<{ message: string }> {
    // In a stateless JWT setup, logout just informs the client to delete tokens.
    // Server doesn’t need to do anything else.
    return { message: 'Logged out successfully' };
  }
}
