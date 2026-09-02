import db from "@/lib/database";
import { isSupabaseStorageConfigured } from "@/lib/supabase-storage";
import { computePublishDiff } from "./publish-diff.service";

export interface DashboardOverviewData {
  projectCounts: {
    total: number;
    published: number;
    draft: number;
    hidden: number;
  };
  technologyCount: number;
  timelineCount: number;
  educationCount: number;
  experienceCount: number;
  mediaCount: number;
  unreadMessageCount: number;
  homepageSectionCount: number;
  pendingChangeCount: number;
  activeTemplate: {
    id: string;
    name: string;
    key: string;
  } | null;
  draftTemplate: {
    id: string;
    name: string;
    key: string;
  } | null;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string | null;
    loginMethod: string | null;
    loginAccountId: string | null;
    createdAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  recentMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    createdAt: Date;
  }>;
  securitySummary: {
    loginMethod: string;
    loginIdentity: string;
    activeSessionCount: number;
    linkedGoogleAccountCount: number;
    lastLoginAt: Date | null;
    recentFailedLoginCount: number;
  };
  homepageSections: Array<{
    id: string;
    type: string;
    internalLabel: string;
    visible: boolean;
    order: number;
  }>;
  systemStatus: {
    database: "Connected" | "Disconnected";
    mediaStorage: "Connected" | "Disconnected";
    authentication: "Operational" | "Degraded";
    googleLogin: "Configured" | "Configuration required";
    contactForm: "Operational" | "Degraded";
  };
}

export class DashboardService {
  async getOverview(userId: string, currentSid: string): Promise<DashboardOverviewData> {
    // 1. Gather all basic counts and data in parallel
    const [
      totalProjects,
      publishedProjects,
      draftProjects,
      hiddenProjects,
      technologyCount,
      timelineCount,
      educationCount,
      experienceCount,
      mediaCount,
      unreadMessageCount,
      pageDetails,
      recentActivity,
      recentMessages,
      activeSessionCount,
      linkedGoogleAccountCount,
      currentUser,
      recentFailedLoginCount,
      currentSession,
      publishDiff,
    ] = await Promise.all([
      db.project.count({ where: { deletedAt: null } }),
      // All three counts below describe LIVE state, so the group is coherent.
      // "draft" previously counted projects having any DRAFT version — but every
      // project always has one (that is the editing model), so it could never be
      // anything but the total. It now means "never went live". "hidden" moved
      // from DRAFT to PUBLISHED for the same reason: mixing the draft axis and
      // the live axis inside one card made the numbers unreadable.
      db.project.count({
        where: {
          deletedAt: null,
          versions: { some: { state: "PUBLISHED", visible: true } }
        }
      }),
      db.project.count({
        where: {
          deletedAt: null,
          versions: { none: { state: "PUBLISHED" } }
        }
      }),
      db.project.count({
        where: {
          deletedAt: null,
          versions: { some: { state: "PUBLISHED", visible: false } }
        }
      }),
      db.technology.count({ where: { deletedAt: null } }),
      db.timelineEntry.count({ where: { deletedAt: null } }),
      db.education.count({ where: { deletedAt: null } }),
      db.experience.count({ where: { deletedAt: null } }),
      db.mediaAsset.count({ where: { deletedAt: null } }),
      db.contactMessage.count({ where: { status: "NEW", deletedAt: null } }),
      db.page.findUnique({
        where: { key: "home" },
        include: {
          draftTemplate: { select: { id: true, name: true, key: true } },
          sections: {
            orderBy: { order: "asc" },
          },
          versions: {
            where: { isActive: true },
            take: 1,
          },
        },
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.contactMessage.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.trackedSession.count({
        where: { userId, revokedAt: null, expiresAt: { gte: new Date() } },
      }),
      db.account.count({
        where: { userId, provider: "google" },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { username: true, lastLoginAt: true },
      }),
      db.loginAttempt.count({
        where: {
          success: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // last 15 mins
        },
      }),
      db.trackedSession.findUnique({
        where: { sid: currentSid },
        include: { account: true },
      }),
      // Real draft-vs-live comparison rather than Page.hasUnpublishedChanges,
      // which is a sticky one-way latch (~40 service writes set it true, only a
      // publish clears it). Joined into this batch so it costs no extra
      // round-trip latency. Returns null only if the home page row is missing.
      computePublishDiff("home").catch(() => null),
    ]);

    // 2. Map Template Keys and versions
    const activeVersion = pageDetails?.versions?.[0];
    let activeTemplate = null;
    if (activeVersion) {
      activeTemplate = {
        id: activeVersion.id,
        name: activeVersion.templateKey.replace(/_/g, " "),
        key: activeVersion.templateKey,
      };
    } else if (pageDetails?.draftTemplate) {
      activeTemplate = {
        id: pageDetails.draftTemplate.id,
        name: pageDetails.draftTemplate.name,
        key: pageDetails.draftTemplate.key,
      };
    }

    const draftTemplate = pageDetails?.draftTemplate
      ? {
          id: pageDetails.draftTemplate.id,
          name: pageDetails.draftTemplate.name,
          key: pageDetails.draftTemplate.key,
        }
      : null;

    // How many distinct things are waiting to go live. Counts the same three
    // axes the publish page reports, so the dashboard card and that page agree
    // instead of contradicting each other.
    const pendingChangeCount = publishDiff
      ? publishDiff.changedEntities.length +
        (publishDiff.hasTemplateDiff ? 1 : 0) +
        (publishDiff.hasSectionsDiff ? 1 : 0)
      : 0;

    // 3. Security Summary details
    const loginMethod = currentSession?.loginMethod || "LOCAL";
    const loginIdentity = loginMethod === "GOOGLE" && currentSession?.account?.email
      ? currentSession.account.email
      : currentUser?.username || "Unknown";

    // 4. System Status Checks
    const isDbConnected = !!db;
    const isGoogleConfigured = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

    return {
      projectCounts: {
        total: totalProjects,
        published: publishedProjects,
        draft: draftProjects,
        hidden: hiddenProjects,
      },
      technologyCount,
      timelineCount,
      educationCount,
      experienceCount,
      mediaCount,
      unreadMessageCount,
      homepageSectionCount: pageDetails?.sections.length || 0,
      pendingChangeCount,
      activeTemplate,
      draftTemplate,
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        summary: log.summary,
        loginMethod: log.loginMethod,
        loginAccountId: log.loginAccountId,
        createdAt: log.createdAt,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
      recentMessages: recentMessages.map((msg) => ({
        id: msg.id,
        name: msg.name,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        status: msg.status,
        createdAt: msg.createdAt,
      })),
      securitySummary: {
        loginMethod,
        loginIdentity,
        activeSessionCount,
        linkedGoogleAccountCount,
        lastLoginAt: currentUser?.lastLoginAt || null,
        recentFailedLoginCount,
      },
      homepageSections: (pageDetails?.sections || []).map((sec) => ({
        id: sec.id,
        type: sec.type,
        internalLabel: sec.internalLabel,
        visible: sec.visible,
        order: sec.order,
      })),
      systemStatus: {
        database: isDbConnected ? "Connected" : "Disconnected",
        mediaStorage: isSupabaseStorageConfigured() ? "Connected" : "Disconnected",
        authentication: "Operational",
        googleLogin: isGoogleConfigured ? "Configured" : "Configuration required",
        contactForm: "Operational",
      },
    };
  }
}

export const dashboardService = new DashboardService();
