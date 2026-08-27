import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";

// Helper to hash password matching src/lib/auth.ts PBKDF2 logic
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 10000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/portfolio?schema=public";
// 10s: a cold Neon compute can take 5-14s just to accept a connection.
const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Templates
  console.log("Creating Templates...");
  await prisma.template.upsert({
    where: { key: "PROFESSIONAL_MINIMAL" },
    update: {},
    create: {
      key: "PROFESSIONAL_MINIMAL",
      name: "Professional Minimal",
      description: "Paper, ink, one viridian accent. Clean layout for recruiters.",
      isActiveLive: false,
    },
  });

  const glassTemplate = await prisma.template.upsert({
    where: { key: "MODERN_GLASS" },
    update: {},
    create: {
      key: "MODERN_GLASS",
      name: "Modern Glass",
      description: "Midnight control room. Neon auroras and glassmorphic panels.",
      isActiveLive: true,
    },
  });

  await prisma.template.upsert({
    where: { key: "INTERACTIVE_3D" },
    update: {},
    create: {
      key: "INTERACTIVE_3D",
      name: "Interactive 3D",
      description: "Dark playable void with solar amber and wireframe icosahedrons.",
      isActiveLive: false,
    },
  });

  // 2. Seed Default Admin User
  console.log("Creating Admin User...");
  const hashedPassword = await hashPassword("admin123");
  await prisma.user.upsert({
    where: { email: "admin@portfolio.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@portfolio.com",
      name: "Portfolio Owner",
      passwordHash: hashedPassword,
      mustChangePassword: true,
    },
  });

  // 3. Seed Default SiteProfile (Identity & Settings)
  console.log("Creating Site Profile...");
  const siteProfile = await prisma.siteProfile.findFirst();
  if (!siteProfile) {
    await prisma.siteProfile.create({
      data: {
        fullName: "Jane Doe",
        logoText: "JD",
        title: "Full-Stack Software Engineer",
        tagline: "Engineering software as craft with precision and intent.",
        heroIntro: "I am a final-year Software Engineering student specialized in web platforms, distributed systems, and performance tuning.",
        aboutBio: "I focus on building performant, accessible web systems. I believe in clean layers, rich aesthetics, and robust engineering architectures.",
        aboutSummary: "Final-year software engineering student passionate about robust system architecture.",
        technicalInterests: "Web Performance, R3F & WebGL, Microservices, Security & Cryptography",
        developmentApproach: "Plan thoroughly, build cleanly with standard layers, verify with typechecks and tests.",
        currentGoals: "Looking for full-time Full-Stack Developer roles starting Fall 2026.",
        availabilityStatus: "Open to work",
        locationText: "Colombo, Sri Lanka",
        contactEmail: "admin@portfolio.com",
        defaultSeoTitle: "Jane Doe | Software Engineer",
        defaultSeoDescription: "Jane Doe's full-stack developer portfolio and visual page builder dashboard.",
        footerText: "Jane Doe",
        maintenanceMode: false,
      },
    });
  }

  // 4. Seed Technologies
  console.log("Creating Technologies...");
  await prisma.technology.deleteMany(); // clean for seeding

  const nextjs = await prisma.technology.create({
    data: {
      slug: "nextjs",
      versions: {
        createMany: {
          data: [
            {
              state: "DRAFT",
              name: "Next.js",
              category: "FRONTEND",
              description: "React framework for production grade app routers.",
              experienceLabel: "STRONG",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 1,
              visible: true,
            },
            {
              state: "PUBLISHED",
              name: "Next.js",
              category: "FRONTEND",
              description: "React framework for production grade app routers.",
              experienceLabel: "STRONG",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 1,
              visible: true,
              publishedAt: new Date(),
            },
          ],
        },
      },
    },
  });

  const prisma7 = await prisma.technology.create({
    data: {
      slug: "prisma",
      versions: {
        createMany: {
          data: [
            {
              state: "DRAFT",
              name: "Prisma ORM",
              category: "DATABASE",
              description: "Next-generation TypeScript database client.",
              experienceLabel: "STRONG",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 2,
              visible: true,
            },
            {
              state: "PUBLISHED",
              name: "Prisma ORM",
              category: "DATABASE",
              description: "Next-generation TypeScript database client.",
              experienceLabel: "STRONG",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 2,
              visible: true,
              publishedAt: new Date(),
            },
          ],
        },
      },
    },
  });

  const postgres = await prisma.technology.create({
    data: {
      slug: "postgresql",
      versions: {
        createMany: {
          data: [
            {
              state: "DRAFT",
              name: "PostgreSQL",
              category: "DATABASE",
              description: "Robust open-source relational database server.",
              experienceLabel: "COMFORTABLE",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 3,
              visible: true,
            },
            {
              state: "PUBLISHED",
              name: "PostgreSQL",
              category: "DATABASE",
              description: "Robust open-source relational database server.",
              experienceLabel: "COMFORTABLE",
              showInStack: true,
              showInGame: true,
              showOnResume: true,
              order: 3,
              visible: true,
              publishedAt: new Date(),
            },
          ],
        },
      },
    },
  });

  // 5. Seed Page and Sections
  console.log("Creating Pages and Default Page Layout...");
  const homePage = await prisma.page.upsert({
    where: { key: "home" },
    update: {},
    create: {
      key: "home",
      title: "Homepage",
      draftTemplateId: glassTemplate.id,
      hasUnpublishedChanges: false,
    },
  });

  const defaultSections = [
    { type: "HERO" as const, internalLabel: "Hero Section", order: 1 },
    { type: "ABOUT" as const, internalLabel: "About Section", order: 2 },
    { type: "TECH_STACK" as const, internalLabel: "Technology Stack", order: 3 },
    { type: "FEATURED_PROJECTS" as const, internalLabel: "Featured Projects", order: 4 },
    { type: "PROJECT_TIMELINE" as const, internalLabel: "Project Timeline", order: 5 },
    { type: "EDUCATION" as const, internalLabel: "Education Details", order: 6 },
    { type: "EXPERIENCE" as const, internalLabel: "Experience History", order: 7 },
    { type: "STACK_GAME" as const, internalLabel: "3D Stack Game", order: 8 },
    { type: "CONTACT" as const, internalLabel: "Contact Form Box", order: 9 },
  ];

  for (const sec of defaultSections) {
    const existing = await prisma.pageSection.findFirst({
      where: { pageId: homePage.id, type: sec.type },
    });
    if (!existing) {
      await prisma.pageSection.create({
        data: {
          pageId: homePage.id,
          type: sec.type,
          internalLabel: sec.internalLabel,
          order: sec.order,
          visible: true,
          settings: {},
        },
      });
    }
  }

  // 6. Seed Sample Projects
  console.log("Creating Sample Projects...");
  await prisma.project.deleteMany(); // clean for seeding

  const sampleProject = await prisma.project.create({
    data: {
      slug: "visual-cms-portfolio",
      versions: {
        createMany: {
          data: [
            {
              state: "DRAFT",
              title: "Visual CMS & Portfolio Builder",
              summary: "A robust portfolio and visual layout manager utilizing Next.js 15, Prisma 7, and R3F interactive systems.",
              fullDescription: "Built to demonstrate clean architecture layers and template styling separation on Next.js 15.",
              category: "FULL_STACK",
              startDate: new Date("2026-05-01"),
              status: "COMPLETED",
              problem: "Traditional developer portfolios are hardcoded static pages that are tedious to keep updated.",
              solution: "Provide a visual editor workbench and version snapshots so portfolios can be managed safely without redeploying code.",
              myRole: "Sole Architect and Developer",
              mainFeatures: "Drag-and-drop page sections, template selector, custom keyframe animation engine.",
              liveDemoUrl: "http://localhost:3000",
              githubUrl: "https://github.com/test/portfolio",
              featured: true,
              showOnHomepage: true,
              showOnTimeline: true,
              visible: true,
            },
            {
              state: "PUBLISHED",
              title: "Visual CMS & Portfolio Builder",
              summary: "A robust portfolio and visual layout manager utilizing Next.js 15, Prisma 7, and R3F interactive systems.",
              fullDescription: "Built to demonstrate clean architecture layers and template styling separation on Next.js 15.",
              category: "FULL_STACK",
              startDate: new Date("2026-05-01"),
              status: "COMPLETED",
              problem: "Traditional developer portfolios are hardcoded static pages that are tedious to keep updated.",
              solution: "Provide a visual editor workbench and version snapshots so portfolios can be managed safely without redeploying code.",
              myRole: "Sole Architect and Developer",
              mainFeatures: "Drag-and-drop page sections, template selector, custom keyframe animation engine.",
              liveDemoUrl: "http://localhost:3000",
              githubUrl: "https://github.com/test/portfolio",
              featured: true,
              showOnHomepage: true,
              showOnTimeline: true,
              visible: true,
              publishedAt: new Date(),
            },
          ],
        },
      },
    },
  });

  // Explicit Join Links for Technologies
  const techsToLink = [nextjs.id, prisma7.id, postgres.id];
  for (let i = 0; i < techsToLink.length; i++) {
    await prisma.projectTechnology.create({
      data: {
        projectId: sampleProject.id,
        technologyId: techsToLink[i],
        order: i + 1,
      },
    });
  }

  // 7. Seed Default Social Links
  console.log("Creating Social Links...");
  const defaultSocials = [
    { platform: "GitHub", url: "https://github.com", order: 1 },
    { platform: "LinkedIn", url: "https://linkedin.com", order: 2 },
    { platform: "Email", url: "mailto:admin@portfolio.com", order: 3 },
  ];

  for (const social of defaultSocials) {
    const existing = await prisma.socialLink.findFirst({
      where: { platform: social.platform },
    });
    if (!existing) {
      await prisma.socialLink.create({
        data: {
          platform: social.platform,
          url: social.url,
          order: social.order,
          visible: true,
          showInHeader: true,
          showInFooter: true,
        },
      });
    }
  }

  // 8. Seed Default Game Settings
  console.log("Creating Game Settings...");
  const gameSettings = await prisma.gameSettings.findFirst();
  if (!gameSettings) {
    await prisma.gameSettings.create({
      data: {
        enabled: true,
        mode: "ROTATING_SPHERE",
        ballCount: 12,
        ballSize: 1.0,
        fallingSpeed: 1.0,
        difficulty: 1,
        soundEnabled: false,
        showScore: true,
        physicsEnabled: false,
        saveScores: false,
        leaderboard: false,
        mobileFallback: true,
      },
    });
  }

  console.log("✨ Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
