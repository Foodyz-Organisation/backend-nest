export class CreateProfessionalDto {
  email: string;
  password: string;
  fullName?: string;
  licenseNumber?: string;
  linkedUserId?: string; // optional link to a normal user
}