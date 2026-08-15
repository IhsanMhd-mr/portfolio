"use client";

import React, { useEffect, useState } from "react";
import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import StatCard from "@/components/admin/dashboard/StatCard";
import WebsiteStatusCard from "@/components/admin/dashboard/WebsiteStatusCard";
import QuickActions from "@/components/admin/dashboard/QuickActions";
import ContentOverview from "@/components/admin/dashboard/ContentOverview";
import RecentActivity from "@/components/admin/dashboard/RecentActivity";
import RecentMessages from "@/components/admin/dashboard/RecentMessages";
import SecuritySummary from "@/components/admin/dashboard/SecuritySummary";
import TemplateSummary from "@/components/admin/dashboard/TemplateSummary";
import HomepageStructurePreview from "@/components/admin/dashboard/HomepageStructurePreview";
import SystemStatus from "@/components/admin/dashboard/SystemStatus";
import DashboardLoading from "@/components/admin/dashboard/DashboardLoading";
import { Briefcase, FileEdit, Cpu, Inbox, List, Image } from "lucide-react";
import { DashboardOverviewData } from "@/services/dashboard.service";

export default function DashboardClientPage() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (!res.ok) {
          throw new Error("Unable to load dashboard information.");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard.");
      }
    }
    loadData();
  }, []);

  function handleMarkRead(id: string) {
    if (!data) return;
    setData({
      ...data,
      unreadMessageCount: Math.max(0, data.unreadMessageCount - 1),
      recentMessages: data.recentMessages.map((m) =>
        m.id === id ? { ...m, status: "READ" } : m
      ),
    });
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border border-solid border-[var(--a-danger-ink)]/20 rounded-[var(--a-r-md)] bg-[var(--a-danger-bg)] text-center space-y-4">
        <p className="text-sm font-semibold text-[var(--a-danger-ink)]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold px-4 py-2 bg-[var(--a-danger)] text-white rounded hover:opacity-90 transition-colors border-none cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return <DashboardLoading />;
  }

  const lastPublishedStr = data.activeTemplate
    ? "Published recently"
    : "Never Published";

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header Card */}
      <DashboardHeader
        ownerName="Ihsan"
        templateName={data.activeTemplate?.name || "Modern Glass"}
        lastPublished={lastPublishedStr}
        loginMethod={data.securitySummary.loginMethod}
        loginIdentity={data.securitySummary.loginIdentity}
      />

      {/* 2. Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Published Projects"
          value={data.projectCounts.published}
          icon={Briefcase}
          href="/admin/projects?status=published"
        />
        <StatCard
          label="Draft Projects"
          value={data.projectCounts.draft}
          icon={FileEdit}
          href="/admin/projects?status=draft"
        />
        <StatCard
          label="Technologies"
          value={data.technologyCount}
          icon={Cpu}
          href="/admin/technologies"
        />
        <StatCard
          label="Unread Messages"
          value={data.unreadMessageCount}
          icon={Inbox}
          href="/admin/messages?status=new"
          highlight={data.unreadMessageCount > 0}
        />
        <StatCard
          label="Homepage Sections"
          value={data.homepageSectionCount}
          icon={List}
          href="/admin/page-builder"
        />
        <StatCard
          label="Media Assets"
          value={data.mediaCount}
          icon={Image}
          href="/admin/media"
        />
      </div>

      {/* 3. Mid Split Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <WebsiteStatusCard
          liveTemplate={data.activeTemplate?.name || "Modern Glass"}
          draftTemplate={data.draftTemplate?.name || "Modern Glass"}
          pendingChangeCount={data.pendingChangeCount}
          lastDraftSave="Just now"
          lastPublished={lastPublishedStr}
        />
        <QuickActions />
      </div>

      {/* 4. Details Grid Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity logs={data.recentActivity} />
        <RecentMessages messages={data.recentMessages} onMarkRead={handleMarkRead} />
      </div>

      {/* 5. Lower Splits */}
      <div className="grid gap-6 md:grid-cols-3">
        <SecuritySummary
          loginMethod={data.securitySummary.loginMethod}
          loginIdentity={data.securitySummary.loginIdentity}
          activeSessionCount={data.securitySummary.activeSessionCount}
          linkedGoogleAccountCount={data.securitySummary.linkedGoogleAccountCount}
          lastLoginAt={data.securitySummary.lastLoginAt}
        />
        <TemplateSummary
          activeTemplate={data.activeTemplate}
          draftTemplate={data.draftTemplate}
        />
        <SystemStatus status={data.systemStatus} />
      </div>

      {/* 6. Homepage Structure */}
      <HomepageStructurePreview sections={data.homepageSections} />

      {/* 7. Content Overview */}
      <ContentOverview
        projects={data.projectCounts}
        technologies={data.technologyCount}
        timeline={data.timelineCount}
        education={data.educationCount}
        experience={data.experienceCount}
        media={data.mediaCount}
      />
    </div>
  );
}
