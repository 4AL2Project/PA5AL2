import { ApiProperty } from '@nestjs/swagger';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiErrorPayload {
  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ example: 'email must be an email' })
  message!: string;

  @ApiProperty({ required: false, nullable: true })
  details?: unknown;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorPayload })
  error!: ApiErrorPayload;
}
