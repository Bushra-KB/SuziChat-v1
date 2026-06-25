import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AppleAuthDto {
  // The JWT identity token returned by Sign in with Apple (native or web).
  @IsString()
  identityToken!: string;

  // Apple only returns the user's name on the very first authorization, so the
  // client forwards it when available. Both are optional.
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  // Consent flags, required only when creating a brand-new account (mirrors the
  // Google flow). Existing users signing in do not need to re-accept.
  @IsOptional()
  @IsBoolean()
  isAdultConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;
}
