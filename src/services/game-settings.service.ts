import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";
import { PageService } from "./page.service";

type AuditContext = {
  actorId: string;
  loginMethod: string;
  loginAccountId: string | null;
  ipAddress?: string;
  userAgent?: string;
};

export interface GameSettingsInput {
  enabled: boolean;
  mode: string;
  ballCount: number;
  ballSize: number;
  fallingSpeed: number;
  difficulty: number;
  soundEnabled: boolean;
  showScore: boolean;
  physicsEnabled: boolean;
  mobileFallback: boolean;
}

/**
 * GameSettingsService — the GameSettings singleton behind the homepage's 3D
 * sandbox section.
 *
 * GameSettings is UNVERSIONED: there is no draft/published pair, so a save
 * here changes what the public homepage renders immediately. The admin route
 * previously updated the row inline and revalidated `/admin/game` only, so the
 * change was invisible on the public site until something else busted its
 * cache.
 */
export class GameSettingsService {
  /** The singleton, bootstrapped with the defaults the section expects. */
  static async getOrCreate() {
    return (
      (await db.gameSettings.findFirst()) ??
      (await db.gameSettings.create({
        data: {
          enabled: true,
          mode: "ROTATING_SPHERE",
          ballCount: 12,
          ballSize: 1.0,
          fallingSpeed: 1.0,
          difficulty: 1,
        },
      }))
    );
  }

  static async update(id: string, input: GameSettingsInput, auditContext: AuditContext) {
    const updated = await db.gameSettings.update({
      where: { id },
      data: {
        enabled: input.enabled,
        mode: input.mode as never,
        ballCount: input.ballCount,
        ballSize: input.ballSize,
        fallingSpeed: input.fallingSpeed,
        difficulty: input.difficulty,
        soundEnabled: input.soundEnabled,
        showScore: input.showScore,
        physicsEnabled: input.physicsEnabled,
        mobileFallback: input.mobileFallback,
      },
    });

    // The sandbox renders on the homepage.
    await PageService.markDirty();

    await recordAudit({
      action: "GAME_SETTINGS_UPDATED",
      entityType: "GameSettings",
      entityId: updated.id,
      summary: "Owner updated 3D sandbox settings.",
      context: auditContext,
    });

    return updated;
  }
}
