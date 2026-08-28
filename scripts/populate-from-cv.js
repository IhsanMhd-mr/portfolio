/**
 * scripts/populate-from-cv.js — One-off: wipe placeholder content and
 * repopulate strictly from Mohamed Ihsan's CV. See conversation-reviewed
 * mapping; not idempotent by design (this is a single deliberate reset).
 *
 * Usage: node --env-file=.env scripts/populate-from-cv.js
 */

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function wipeContent() {
  await db.timelineEntry.deleteMany({});
  await db.project.deleteMany({});
  await db.experience.deleteMany({});
  await db.education.deleteMany({});
  await db.technology.deleteMany({});
  await db.certification.deleteMany({});
  await db.socialLink.deleteMany({});
  console.log("Wiped: Timeline, Project, Experience, Education, Technology, Certification, SocialLink");
}

async function updateSiteProfile() {
  const existing = await db.siteProfile.findFirst();
  const data = {
    fullName: "Mohamed Ihsan",
    logoText: "Ihsan",
    title: "Software Engineer",
    tagline: null,
    heroIntro: null,
    aboutBio:
      "Final-year Software Engineering student with final examinations completed and hands-on experience in full-stack development, REST APIs, databases, computer vision, and AI systems. Experienced with React, JavaScript/TypeScript, Node.js, Express, PostgreSQL, Python, PyTorch, YOLO11, and OpenCV, with professional experience in client communication, requirements gathering, project coordination, deployment support, and software delivery. Seeking graduate or entry-level roles in Software Engineering, Full-Stack/Backend Development, or AI/Computer Vision.",
    aboutSummary: null,
    technicalInterests:
      "Software Engineering, Full-Stack Development, Backend Development, Artificial Intelligence, Computer Vision",
    developmentApproach: null,
    currentGoals:
      "Seeking graduate or entry-level roles in Software Engineering, Full-Stack/Backend Development, or AI/Computer Vision.",
    availabilityStatus: "Open to graduate and entry-level Software Engineering opportunities",
    locationText: "Sri Lanka",
    contactEmail: "ihsanmhd.mr@gmail.com",
  };
  if (existing) {
    await db.siteProfile.update({ where: { id: existing.id }, data });
  } else {
    await db.siteProfile.create({ data });
  }
  console.log("SiteProfile: updated");
}

async function createSocialLinks() {
  await db.socialLink.createMany({
    data: [
      { platform: "github", url: "https://github.com/IhsanMhd-mr", showInHeader: true, showInFooter: true, visible: true, order: 0 },
      { platform: "linkedin", url: "https://linkedin.com/in/ihsan-mhd", showInHeader: true, showInFooter: true, visible: true, order: 1 },
    ],
  });
  console.log("SocialLink: created 2");
}

const TECH_POOL = [
  // Programming
  { slug: "python", name: "Python", category: "BACKEND", label: "COMFORTABLE" },
  { slug: "java", name: "Java", category: "OTHER", label: "WORKING_KNOWLEDGE" },
  { slug: "javascript", name: "JavaScript", category: "FRONTEND", label: "COMFORTABLE" },
  { slug: "typescript", name: "TypeScript", category: "FRONTEND", label: "COMFORTABLE" },
  // Web & Backend
  { slug: "react", name: "React", category: "FRONTEND", label: "COMFORTABLE" },
  { slug: "html5", name: "HTML5", category: "FRONTEND", label: "WORKING_KNOWLEDGE" },
  { slug: "css3", name: "CSS3", category: "FRONTEND", label: "WORKING_KNOWLEDGE" },
  { slug: "vite", name: "Vite", category: "FRONTEND", label: "WORKING_KNOWLEDGE" },
  { slug: "nodejs", name: "Node.js", category: "BACKEND", label: "COMFORTABLE" },
  { slug: "expressjs", name: "Express.js", category: "BACKEND", label: "COMFORTABLE" },
  { slug: "flask", name: "Flask", category: "BACKEND", label: "WORKING_KNOWLEDGE" },
  { slug: "rest-apis", name: "REST APIs", category: "BACKEND", label: "WORKING_KNOWLEDGE" },
  { slug: "api-integration", name: "API Integration", category: "BACKEND", label: "WORKING_KNOWLEDGE" },
  // Databases
  { slug: "postgresql", name: "PostgreSQL", category: "DATABASE", label: "COMFORTABLE" },
  { slug: "mysql", name: "MySQL", category: "DATABASE", label: "WORKING_KNOWLEDGE" },
  { slug: "mongodb", name: "MongoDB", category: "DATABASE", label: "WORKING_KNOWLEDGE" },
  { slug: "sql", name: "SQL", category: "DATABASE", label: "WORKING_KNOWLEDGE" },
  { slug: "sequelize", name: "Sequelize", category: "DATABASE", label: "WORKING_KNOWLEDGE" },
  { slug: "database-design", name: "Database Design", category: "DATABASE", label: "WORKING_KNOWLEDGE" },
  // AI / Computer Vision
  { slug: "pytorch", name: "PyTorch", category: "AI_ML", label: "COMFORTABLE" },
  { slug: "yolo11", name: "YOLO11", category: "AI_ML", label: "COMFORTABLE" },
  { slug: "midas", name: "MiDaS", category: "AI_ML", label: "WORKING_KNOWLEDGE" },
  { slug: "opencv", name: "OpenCV", category: "AI_ML", label: "COMFORTABLE" },
  { slug: "model-fine-tuning", name: "Model Fine-tuning", category: "AI_ML", label: "WORKING_KNOWLEDGE" },
  { slug: "depth-estimation", name: "Depth Estimation", category: "AI_ML", label: "WORKING_KNOWLEDGE" },
  // Tools & Deployment
  { slug: "git", name: "Git", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "github", name: "GitHub", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "docker", name: "Docker", category: "DEVOPS", label: "WORKING_KNOWLEDGE" },
  { slug: "linux", name: "Linux", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "vs-code", name: "VS Code", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "postman", name: "Postman", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "javafx", name: "JavaFX", category: "OTHER", label: "WORKING_KNOWLEDGE" },
  { slug: "phpmyadmin", name: "phpMyAdmin", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "xampp", name: "XAMPP", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
  { slug: "aws-hosting", name: "AWS Hosting", category: "DEVOPS", label: "WORKING_KNOWLEDGE" },
  { slug: "cpanel", name: "cPanel", category: "TOOLS", label: "WORKING_KNOWLEDGE" },
];

async function createTechnologies() {
  const bySlug = {};
  for (const [i, t] of TECH_POOL.entries()) {
    const versionFields = {
      name: t.name,
      category: t.category,
      experienceLabel: t.label,
      showInStack: true,
      showOnResume: true,
      visible: true,
      order: i,
    };
    const tech = await db.technology.create({
      data: {
        slug: t.slug,
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
    bySlug[t.slug] = tech.id;
  }
  console.log(`Technology: created ${TECH_POOL.length}`);
  return bySlug;
}

async function createEducation() {
  const entries = [
    {
      institution: "University of Westminster, London, UK",
      qualification: "BSc (Hons) Software Engineering",
      startDate: "2021-01-01",
      endDate: "2026-01-01",
      description:
        "Delivered in partnership with Informatics Institute of Technology (IIT), Colombo, Sri Lanka. Final examinations completed; final results and degree award pending.",
    },
    {
      institution: "Rajarata University of Sri Lanka",
      qualification: "Diploma in English",
      startDate: "2021-01-01",
      endDate: "2022-01-01",
      description: null,
    },
  ];
  for (const [i, e] of entries.entries()) {
    const versionFields = {
      institution: e.institution,
      qualification: e.qualification,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
      description: e.description,
      showOnResume: true,
      visible: true,
      order: i,
    };
    await db.education.create({
      data: {
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
  }
  console.log(`Education: created ${entries.length}`);
}

async function createExperience(techBySlug) {
  const versionFields = {
    organization: "Hasthiya IT",
    role: "Intern / Software Development",
    startDate: new Date("2023-08-01"),
    endDate: new Date("2024-08-01"),
    isCurrent: false,
    workType: "INTERNSHIP",
    description:
      "Contributed to web application and REST API development, working across frontend/backend implementation, API integration, debugging, testing and feature delivery, while supporting cPanel and AWS-based hosting. Worked directly with clients and stakeholders to gather requirements, clarify issues and translate business needs into development tasks, while supporting project coordination, documentation and software delivery. Assisted with deployment and CI/CD workflows under senior developer guidance and provided ongoing application and hosting support for projects after deployment.",
    showOnResume: true,
    visible: true,
    order: 0,
  };
  const exp = await db.experience.create({
    data: {
      versions: {
        create: [
          { state: "DRAFT", ...versionFields },
          { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
        ],
      },
    },
  });
  const techIds = [techBySlug["aws-hosting"], techBySlug["cpanel"]].filter(Boolean);
  if (techIds.length) {
    await db.experienceTechnology.createMany({
      data: techIds.map((technologyId) => ({ experienceId: exp.id, technologyId })),
    });
  }
  console.log("Experience: created 1");
  return exp.id;
}

const PROJECT_POOL = [
  {
    slug: "livedet",
    title: "LIVEDET",
    summary:
      "Real-time computer vision system for pothole detection and depth estimation using YOLO11, PyTorch, OpenCV and MiDaS, achieving 72.50% mAP@50 through YOLO11 fine-tuning.",
    fullDescription:
      "Real-time computer vision system developed with Python, YOLO11, PyTorch, OpenCV and MiDaS for pothole detection and depth estimation. Designed an end-to-end pipeline combining detection, depth estimation, calibration, perspective correction and severity scoring, achieving 72.50% mAP@50 through YOLO11 fine-tuning.",
    category: "MACHINE_LEARNING",
    featured: true,
    tech: ["python", "yolo11", "pytorch", "opencv", "midas"],
  },
  {
    slug: "ims-inventory-management-system",
    title: "IMS - Custom Inventory Management System",
    summary:
      "Custom full-stack web application to support core inventory operations: materials, production, finished products, stock, sales and purchasing.",
    fullDescription:
      "Custom full-stack web application developed with React, JavaScript, Node.js, Express, Sequelize and PostgreSQL to support core inventory operations: materials, production, finished products, stock, sales and purchasing. Implemented REST APIs, database operations, reusable frontend components and integrated frontend/backend workflows, with the system designed to support further functional enhancements based on customer requirements.",
    category: "FULL_STACK",
    featured: false,
    tech: ["react", "javascript", "nodejs", "expressjs", "sequelize", "postgresql"],
  },
  {
    slug: "portfolio-management-application",
    title: "Portfolio Management Application",
    summary:
      "Web application featuring reusable components, structured frontend architecture and responsive interfaces.",
    fullDescription:
      "Web application developed with React, TypeScript and Vite, featuring reusable components, structured frontend architecture and responsive interfaces. Applied TypeScript for type safety and maintainability and Git/GitHub for version control.",
    category: "WEB",
    featured: false,
    tech: ["react", "typescript", "vite"],
  },
  {
    slug: "skin-consultation-management-system",
    title: "Skin Consultation Management System",
    summary:
      "Java-based skin consultation management system applying object-oriented programming principles (2nd Year OOP Coursework).",
    fullDescription:
      "Developed a Java-based skin consultation management system, applying object-oriented programming principles to structure and manage consultation functionality.",
    category: "JAVA",
    featured: false,
    tech: ["java"],
  },
  {
    slug: "skin-rash-type-prediction-application",
    title: "Skin Rash Type Prediction Application",
    summary:
      "Machine learning-based skin rash prediction application with a web-based interface (Software Development Group Project).",
    fullDescription:
      "Developed a machine learning-based skin rash prediction application using Python and Flask, providing a web-based interface for interacting with the prediction system.",
    category: "MACHINE_LEARNING",
    featured: false,
    tech: ["python", "flask"],
  },
];

async function createProjects(techBySlug) {
  for (const [i, p] of PROJECT_POOL.entries()) {
    const versionFields = {
      title: p.title,
      summary: p.summary,
      fullDescription: p.fullDescription,
      category: p.category,
      status: "COMPLETED",
      featured: p.featured,
      showOnHomepage: p.featured,
      showOnResume: true,
      visible: true,
      manualOrder: i,
    };
    const project = await db.project.create({
      data: {
        slug: p.slug,
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
    const techIds = p.tech.map((slug) => techBySlug[slug]).filter(Boolean);
    if (techIds.length) {
      await db.projectTechnology.createMany({
        data: techIds.map((technologyId, order) => ({ projectId: project.id, technologyId, order })),
      });
    }
  }
  console.log(`Project: created ${PROJECT_POOL.length}`);
}

async function createTimeline(experienceStartLabel) {
  const entries = [
    {
      title: "Started BSc (Hons) Software Engineering at University of Westminster",
      entryType: "ACADEMIC",
      startDate: "2021-01-01",
      description: "Began degree, delivered in partnership with Informatics Institute of Technology (IIT), Colombo.",
    },
    {
      title: "Started Diploma in English at Rajarata University of Sri Lanka",
      entryType: "ACADEMIC",
      startDate: "2021-01-01",
      description: null,
    },
    {
      title: "Started Internship at Hasthiya IT",
      entryType: "MILESTONE",
      startDate: "2023-08-01",
      description: "Began Intern / Software Development role.",
    },
  ];
  for (const [i, t] of entries.entries()) {
    const versionFields = {
      title: t.title,
      entryType: t.entryType,
      startDate: new Date(t.startDate),
      description: t.description,
      visible: true,
      order: i,
    };
    await db.timelineEntry.create({
      data: {
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
  }
  console.log(`Timeline: created ${entries.length}`);
}

async function main() {
  console.log("\nWipe + repopulate from CV (Mohamed Ihsan)\n");
  await wipeContent();
  await updateSiteProfile();
  await createSocialLinks();
  const techBySlug = await createTechnologies();
  await createEducation();
  await createExperience(techBySlug);
  await createProjects(techBySlug);
  await createTimeline();
  console.log("\nDone.\n");
}

main()
  .catch((e) => {
    console.error("Failed:", (e && e.message) || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
