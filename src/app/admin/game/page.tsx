import { GameSettingsService } from "@/services/game-settings.service";
import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import { Gamepad2, Save } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";

export default async function AdminGamePage() {
  await requireAdmin("/admin/game");
  const settings = await GameSettingsService.getOrCreate();

  async function updateSettings(formData: FormData) {
    "use server";
    // Server Actions are independently invocable POST endpoints — the
    // admin layout guards page RENDERING, not this.
    const ctx = await requireAdmin();
    const num = (key: string, fallback: number) =>
      Number(formData.get(key)) || fallback;

    await GameSettingsService.update(
      String(formData.get("id") || ""),
      {
        enabled: formData.get("enabled") === "on",
        mode: String(formData.get("mode") || "ROTATING_SPHERE"),
        ballCount: num("ballCount", 12),
        ballSize: num("ballSize", 1.0),
        fallingSpeed: num("fallingSpeed", 1.0),
        difficulty: num("difficulty", 1),
        soundEnabled: formData.get("soundEnabled") === "on",
        showScore: formData.get("showScore") === "on",
        physicsEnabled: formData.get("physicsEnabled") === "on",
        mobileFallback: formData.get("mobileFallback") === "on",
      },
      { actorId: ctx.userId, loginMethod: ctx.loginMethod, loginAccountId: ctx.loginAccountId }
    );

    revalidatePath("/admin/game");
    // The sandbox renders on the homepage and GameSettings is unversioned,
    // so the change is live immediately. Revalidating only the admin route
    // left the public page showing the old configuration.
    revalidatePath("/");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">3D Sandbox Settings</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Configure the interactive HTML5 Canvas stack game and float simulation on the homepage.
        </p>
      </div>

      <form 
        action={updateSettings} 
        className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <input type="hidden" name="id" value={settings.id} />

        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
          <Gamepad2 size={16} className="text-[var(--a-primary)]" />
          General Config
        </h3>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="font-bold text-xs text-[var(--a-ink)]">Enable Sandbox Section</label>
            <p className="text-[10px] text-[var(--a-soft)] mt-0.5">Toggle rendering of the interactive canvas.</p>
          </div>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="w-4 h-4 text-[var(--a-primary)] focus:ring-[var(--a-primary)]"
          />
        </div>

        {/* Sandbox Game Mode */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Simulation Mode</label>
          <select
            name="mode"
            defaultValue={settings.mode}
            className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]"
          >
            <option value="ROTATING_SPHERE">Rotating Sphere (3D tag cloud)</option>
            <option value="FLOATING_BALLS">Floating Balls (Bouncing physics circles)</option>
            <option value="FALLING_GAME">Falling Stack Game (Block drop stacker)</option>
            <option value="STATIC_FALLBACK">Static Fallback Grid</option>
          </select>
        </div>

        {/* Details Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Ball count */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Entity Limit</label>
            <input
              type="number"
              name="ballCount"
              min="2"
              max="30"
              defaultValue={settings.ballCount}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
            <p className="text-[9px] text-[var(--a-faint)]">Maximum number of technology tags shown in canvas.</p>
          </div>

          {/* Ball size */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Size Scale</label>
            <input
              type="number"
              name="ballSize"
              step="0.1"
              min="0.5"
              max="2.5"
              defaultValue={settings.ballSize}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
            <p className="text-[9px] text-[var(--a-faint)]">Multiplier for ball sizes in floating simulation.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Falling speed */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Drop Speed</label>
            <input
              type="number"
              name="fallingSpeed"
              step="0.1"
              min="0.5"
              max="3.0"
              defaultValue={settings.fallingSpeed}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Game Difficulty</label>
            <input
              type="number"
              name="difficulty"
              min="1"
              max="5"
              defaultValue={settings.difficulty}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>
        </div>

        {/* Toggles Grid */}
        <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-solid border-[var(--a-line)]">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[var(--a-soft)]">Show Scores Leaderboard</label>
            <input type="checkbox" name="showScore" defaultChecked={settings.showScore} />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[var(--a-soft)]">Enable Bouncing Physics</label>
            <input type="checkbox" name="physicsEnabled" defaultChecked={settings.physicsEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[var(--a-soft)]">Interactive Sounds</label>
            <input type="checkbox" name="soundEnabled" defaultChecked={settings.soundEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-semibold text-xs text-[var(--a-soft)]">Mobile Canvas Fallback</label>
            <input type="checkbox" name="mobileFallback" defaultChecked={settings.mobileFallback} />
          </div>
        </div>

        {/* Submit */}
        <PendingButton
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-60"
          pendingLabel="Saving…"
        >
          <Save size={14} />
          Save Sandbox Configuration
        </PendingButton>
      </form>
    </div>
  );
}
