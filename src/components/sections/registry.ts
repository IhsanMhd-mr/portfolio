import HeroSection from "./HeroSection";
import AboutSummarySection from "./AboutSummarySection";
import TechnologyStackSection from "./TechnologyStackSection";
import FeaturedProjectsSection from "./FeaturedProjectsSection";
import ProjectGridSection from "./ProjectGridSection";
import ProjectTimelineSection from "./ProjectTimelineSection";
import EducationExperienceSection from "./EducationExperienceSection";
import OtherProjectsSection from "./OtherProjectsSection";
import StackGameSection from "./StackGameSection";
import ContactCTASection from "./ContactCTASection";

export const sectionRegistry = {
  "hero": HeroSection,
  "about": AboutSummarySection,
  "tech-stack": TechnologyStackSection,
  "featured-projects": FeaturedProjectsSection,
  "project-grid": ProjectGridSection,
  "project-timeline": ProjectTimelineSection,
  "education-experience": EducationExperienceSection,
  "other-projects": OtherProjectsSection,
  "stack-game": StackGameSection,
  "contact": ContactCTASection,
};

// Map database enums to registry keys
export const dbEnumToRegistryKey: Record<string, string> = {
  HERO: "hero",
  ABOUT: "about",
  TECH_STACK: "tech-stack",
  FEATURED_PROJECTS: "featured-projects",
  PROJECT_GRID: "project-grid",
  PROJECT_TIMELINE: "project-timeline",
  EDUCATION: "education-experience",
  EXPERIENCE: "education-experience",
  STACK_GAME: "stack-game",
  CONTACT: "contact",
  CALL_TO_ACTION: "contact",
};
