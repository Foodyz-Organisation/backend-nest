import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from '../professionalaccount/schema/professionalaccount.schema';
import { SignupDto } from './dto/Signup.dto';
import { ProfessionalSignupDto } from './dto/ProfessionalSignup.dto';
import { LoginDto } from './dto/Login.dto';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  // ✅ Stocker temporairement les OTP (en production, utilisez Redis)
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();

  constructor(
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name) private profModel: Model<ProfessionalDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ================= User Signup =================
  async userSignup(userData: SignupDto) {
    if (!userData.password) throw new Error('Password is required');
    const normalizedEmail = userData.email.trim().toLowerCase();
    const hashed = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      ...userData,
      email: normalizedEmail,
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
    const normalizedEmail = profData.email.trim().toLowerCase();
    const hashed = await bcrypt.hash(profData.password, 10);
    const newProf = new this.profModel({
      ...profData,
      email: normalizedEmail,
      password: hashed,
      role: 'professional',
      isActive: true,
    });
    await newProf.save();
    return { message: 'Professional registered successfully' };
  }

  // ================= Login =================
  async login(loginData: LoginDto) {
    const { email, password } = loginData;
    const normalizedEmail = email.trim().toLowerCase();

    let account: UserDocument | ProfessionalDocument | null = await this.userModel.findOne({ email: normalizedEmail }).exec();
    let role: 'user' | 'professional' = 'user';

    if (!account) {
      account = await this.profModel.findOne({ email: normalizedEmail }).exec();
      role = 'professional';
    }

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (!account.isActive) throw new UnauthorizedException('Account is deactivated');

    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: account._id, email: account.email, role };
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

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

  // ================= SEND OTP =================
  async sendOtp(email: string) {
    console.log('🔍 OTP request for:', email);
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Vérifier si l'utilisateur existe
    let account: UserDocument | ProfessionalDocument | null = await this.userModel.findOne({ email: normalizedEmail }).exec();
    
    if (!account) {
      account = await this.profModel.findOne({ email: normalizedEmail }).exec();
    }
    
    if (!account) {
      // Ne pas révéler si l'email existe ou non
      return { 
        success: true, 
        message: 'If this email exists, an OTP has been sent' 
      };
    }

    // Générer un code à 6 chiffres
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log('🔑 Generated OTP:', otp);
    
    // Stocker l'OTP avec expiration de 10 minutes
    this.otpStore.set(normalizedEmail, {
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Envoyer l'email
    try {
      await this.sendOtpEmail(normalizedEmail, otp);
      console.log('✅ OTP sent successfully');
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw new BadRequestException('Failed to send OTP email');
    }

    return { 
      success: true, 
      message: 'OTP sent to your email' 
    };
  }

  // ================= VERIFY OTP =================
  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const stored = this.otpStore.get(normalizedEmail);

    console.log('🔍 Verifying OTP for:', normalizedEmail);
    console.log('📥 Received OTP:', otp);
    console.log('💾 Stored OTP:', stored?.otp);

    if (!stored) {
      throw new UnauthorizedException('No OTP found. Please request a new one.');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new UnauthorizedException('OTP expired. Please request a new one.');
    }

    if (stored.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // OTP valide, générer un token temporaire pour reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('✅ OTP verified, generated reset token');
    
    // Stocker le token (remplacer l'OTP)
    this.otpStore.set(normalizedEmail, {
      otp: resetToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    return { 
      success: true, 
      message: 'OTP verified',
      resetToken
    };
  }

  // ================= RESET PASSWORD =================
// ================= RESET PASSWORD =================
// ================= RESET PASSWORD =================
// ================= RESET PASSWORD =================
async resetPassword(email: string, resetToken: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const stored = this.otpStore.get(normalizedEmail);

  console.log('🔍 Resetting password for:', normalizedEmail);

  if (!stored || stored.otp !== resetToken) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  if (new Date() > stored.expiresAt) {
    this.otpStore.delete(normalizedEmail);
    throw new UnauthorizedException('Token expired');
  }

  // Trouver le compte
  let account: UserDocument | ProfessionalDocument | null = 
    await this.userModel.findOne({ email: normalizedEmail }).exec();
  let isUser = true;

  if (!account) {
    account = await this.profModel.findOne({ email: normalizedEmail }).exec();
    isUser = false;
  }

  if (!account) {
    throw new UnauthorizedException('Account not found');
  }

  // ✅ LOGS POUR DÉBOGUER
  console.log('🔐 Old password hash:', account.password.substring(0, 20) + '...');
  
  // Mettre à jour le mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  console.log('🔐 New password hash:', hashedPassword.substring(0, 20) + '...');
  
  // ✅ UTILISER save() au lieu de updateOne()
  account.password = hashedPassword;
  await account.save();

  // Vérifier immédiatement après la sauvegarde
  const updatedAccount = isUser 
    ? await this.userModel.findOne({ email: normalizedEmail }).exec()
    : await this.profModel.findOne({ email: normalizedEmail }).exec();

  // ✅ FIX: Vérifier que updatedAccount n'est pas null
  if (updatedAccount) {
    console.log('🔐 Saved password hash:', updatedAccount.password.substring(0, 20) + '...');
    console.log('✅ Password match:', updatedAccount.password === hashedPassword);
  } else {
    console.error('❌ Failed to retrieve updated account');
  }

  // Nettoyer le store
  this.otpStore.delete(normalizedEmail);
  console.log('✅ Password reset successfully');

  return { 
    success: true, 
    message: 'Password reset successfully' 
  };
}

  // ================= SEND OTP EMAIL =================
  async sendOtpEmail(email: string, otp: string) {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('MAIL_PORT', '587'), 10),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });

    await transporter.verify();
    
    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Reset</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Hello!</h2>
            
            <p style="font-size: 16px; margin: 20px 0;">
              You requested a password reset. Use this verification code:
            </p>
            
            <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your verification code is:</p>
              <h1 style="color: #4CAF50; font-size: 48px; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⏰ <strong>Important:</strong> This code expires in 10 minutes.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 20px 0;">
              If you didn't request this code, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              This is an automated message, please do not reply.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}