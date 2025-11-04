import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
@ApiProperty({ description: 'Email address of the account', example: '[user@example.com](mailto:user@example.com)' })
email: string;

@ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
password: string;
}
