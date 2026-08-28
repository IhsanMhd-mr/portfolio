/**
 * Boundary for the future OTP transport and verification implementation.
 * No provider is configured today, so this service deliberately performs no
 * account lookup and cannot issue or verify a reset credential.
 */
export class PasswordRecoveryService {
  static async requestOtp(_identifier: string) {
    return { ok: false as const, reason: "otp-provider-unavailable" as const };
  }
}
