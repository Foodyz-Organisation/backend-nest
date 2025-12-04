import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalSignupDto {
@ApiProperty({ description: 'Email address of the professional', example: '[pro@example.com](mailto:pro@example.com)' })
email: string;

@ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
password: string;

@ApiProperty({
description: 'Professional-specific data',
example: {
fullName: 'John Doe',
licenseNumber: 'LIC123456',
documents: [
{ filename: 'license.pdf', path: '/uploads/license.pdf' }
]
}
})
professionalData: {
fullName: string;
licenseNumber: string;
documents?: { filename: string; path: string }[];
};
}
