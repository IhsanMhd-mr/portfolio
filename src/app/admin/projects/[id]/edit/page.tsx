import db from "@/lib/database";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Briefcase, Eye, Star, Link as LinkIcon, FileText, Image as ImageIcon } from "lucide-react";
import { updateProjectAction } from "../../actions";
import GalleryManager from "@/components/admin/projects/GalleryManager";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;

  // Load project + technologies (for selector) concurrently — media is no
  // longer fetched in full here; MediaPickerModal/GalleryManager fetch
  // paginated/searchable results on demand instead.
  const [project, allTechs] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        versions: {
          where: { state: "DRAFT" },
          take: 1,
          include: {
            thumbnail: { select: { filename: true, url: true } },
            coverImage: { select: { filename: true, url: true } },
            architectureImage: { select: { filename: true, url: true } },
          },
        },
        technologies: { orderBy: { order: "asc" } },
        images: { include: { media: true }, orderBy: { order: "asc" } },
      },
    }),
    db.technology.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "DRAFT" }, take: 1, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  if (!project || project.deletedAt) {
    notFound();
  }

  const draft = project.versions[0];
  if (!draft) {
    notFound();
  }

  // Server action handler inside compiler-friendly space
  async function updateProjectCaseStudy(formData: FormData) {
    "use server";
    const projId = formData.get("id") as string;
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const summary = formData.get("summary") as string;
    const category = formData.get("category") as any;
    const status = formData.get("status") as any;
    const myRole = formData.get("myRole") as string;
    
    const problem = formData.get("problem") as string;
    const solution = formData.get("solution") as string;
    const mainFeatures = formData.get("mainFeatures") as string;
    const systemArchitecture = formData.get("systemArchitecture") as string;
    const developmentProcess = formData.get("developmentProcess") as string;
    const challenges = formData.get("challenges") as string;
    const solutionsDetail = formData.get("solutionsDetail") as string;
    const testing = formData.get("testing") as string;
    const results = formData.get("results") as string;
    const lessonsLearned = formData.get("lessonsLearned") as string;

    const liveDemoUrl = formData.get("liveDemoUrl") as string;
    const githubUrl = formData.get("githubUrl") as string;
    const reportUrl = formData.get("reportUrl") as string;
    const documentationUrl = formData.get("documentationUrl") as string;
    const videoUrl = formData.get("videoUrl") as string;
    const presentationUrl = formData.get("presentationUrl") as string;

    const seoTitle = formData.get("seoTitle") as string;
    const seoDescription = formData.get("seoDescription") as string;

    const startDateInput = formData.get("startDate") as string;
    const endDateInput = formData.get("endDate") as string;
    const startDate = startDateInput ? new Date(startDateInput) : null;
    const endDate = endDateInput ? new Date(endDateInput) : null;

    const visible = formData.get("visible") === "on";
    const featured = formData.get("featured") === "on";

    const thumbnailId = formData.get("thumbnailId") as string || null;
    const coverImageId = formData.get("coverImageId") as string || null;
    const architectureImageId = formData.get("architectureImageId") as string || null;

    // Parse technology selections
    const selectedTechIds: string[] = [];
    allTechs.forEach((t) => {
      if (formData.get(`tech_${t.id}`) === "on") {
        selectedTechIds.push(t.id);
      }
    });

    // Parse gallery selections
    const gallery: { mediaId: string; caption?: string }[] = [];
    const galleryCount = parseInt(formData.get("gallery_count") as string || "0");
    for (let i = 0; i < galleryCount; i++) {
      const mediaId = formData.get(`gallery_media_${i}`) as string;
      const caption = formData.get(`gallery_caption_${i}`) as string;
      if (mediaId) {
        gallery.push({ mediaId, caption });
      }
    }

    await updateProjectAction(projId, {
      title,
      slug,
      summary,
      category,
      status,
      myRole,
      problem,
      solution,
      mainFeatures,
      systemArchitecture,
      developmentProcess,
      challenges,
      solutionsDetail,
      testing,
      results,
      lessonsLearned,
      liveDemoUrl,
      githubUrl,
      reportUrl,
      documentationUrl,
      videoUrl,
      presentationUrl,
      seoTitle,
      seoDescription,
      startDate,
      endDate,
      visible,
      featured,
      thumbnailId,
      coverImageId,
      architectureImageId,
      technologyIds: selectedTechIds,
      gallery,
    });

    redirect("/admin/projects");
  }

  // Format dates for input fields
  const defaultStartDate = draft.startDate ? draft.startDate.toISOString().substring(0, 10) : "";
  const defaultEndDate = draft.endDate ? draft.endDate.toISOString().substring(0, 10) : "";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/projects"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Case Study</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1">Configure project layout context and detail draft write-ups.</p>
        </div>
      </div>

      <form action={updateProjectCaseStudy} className="space-y-8">
        <input type="hidden" name="id" value={project.id} />

        {/* 1. Basic Information Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Briefcase size={16} className="text-[var(--a-primary)]" />
            Basic Details
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Project Title</label>
              <input
                type="text"
                name="title"
                required
                defaultValue={draft.title}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Dynamic URL Slug</label>
              <input
                type="text"
                name="slug"
                required
                defaultValue={project.slug}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Summary Description</label>
            <input
              type="text"
              name="summary"
              required
              defaultValue={draft.summary}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Category</label>
              <select
                name="category"
                defaultValue={draft.category}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="WEB">Web Platform</option>
                <option value="FULL_STACK">Full-Stack System</option>
                <option value="MACHINE_LEARNING">AI / ML</option>
                <option value="JAVA">Java Platform</option>
                <option value="ACADEMIC">Academic Project</option>
                <option value="OTHER">Other Type</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Development Status</label>
              <select
                name="status"
                defaultValue={draft.status}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="MAINTAINED">Maintained</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
              <input
                type="date"
                name="startDate"
                defaultValue={defaultStartDate}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">End Date</label>
              <input
                type="date"
                name="endDate"
                defaultValue={defaultEndDate}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 pt-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="visible" defaultChecked={draft.visible} className="cursor-pointer" />
              <label className="text-xs font-semibold text-[var(--a-soft)] cursor-pointer">Draft Visibility (Show publicly on next publish)</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="featured" defaultChecked={draft.featured} className="cursor-pointer" />
              <label className="text-xs font-semibold text-[var(--a-soft)] cursor-pointer">Set as Featured project</label>
            </div>
          </div>
        </div>

        {/* 2. Media Selectors Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <ImageIcon size={16} className="text-[var(--a-primary)]" />
            Project Media Assets
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <MediaPickerModal name="thumbnailId" label="Thumbnail Asset" mode="single" defaultValue={draft.thumbnailId} defaultPreview={draft.thumbnail} />
            <MediaPickerModal name="coverImageId" label="Cover Image Asset" mode="single" defaultValue={draft.coverImageId} defaultPreview={draft.coverImage} />
            <MediaPickerModal name="architectureImageId" label="Architecture Image Asset" mode="single" defaultValue={draft.architectureImageId} defaultPreview={draft.architectureImage} />
          </div>
        </div>

        {/* 3. Associated Technologies Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Star size={16} className="text-[var(--a-primary)]" />
            Technologies Used
          </h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {allTechs.map((tech) => {
              const name = tech.versions.find((v) => v.state === "DRAFT")?.name || tech.slug;
              const isLinked = project.technologies.some((t) => t.technologyId === tech.id);
              return (
                <div key={tech.id} className="flex items-center gap-2 p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded">
                  <input
                    type="checkbox"
                    id={`tech_${tech.id}`}
                    name={`tech_${tech.id}`}
                    defaultChecked={isLinked}
                    className="cursor-pointer"
                  />
                  <label htmlFor={`tech_${tech.id}`} className="text-xs text-[var(--a-ink)] cursor-pointer">
                    {name}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Detailed Case Study Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Eye size={16} className="text-[var(--a-primary)]" />
            Detailed Case Study Context
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">My Role / Responsibilities</label>
              <input
                type="text"
                name="myRole"
                defaultValue={draft.myRole || ""}
                placeholder="Sole Developer, Technical Lead, Architect"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">The Problem</label>
              <textarea
                name="problem"
                rows={3}
                defaultValue={draft.problem || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">The Solution</label>
              <textarea
                name="solution"
                rows={3}
                defaultValue={draft.solution || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Key Features</label>
              <textarea
                name="mainFeatures"
                rows={3}
                defaultValue={draft.mainFeatures || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">System Architecture</label>
              <textarea
                name="systemArchitecture"
                rows={3}
                defaultValue={draft.systemArchitecture || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Development Process</label>
              <textarea
                name="developmentProcess"
                rows={3}
                defaultValue={draft.developmentProcess || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Challenges Faced</label>
                <textarea
                  name="challenges"
                  rows={3}
                  defaultValue={draft.challenges || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Detailed Solutions</label>
                <textarea
                  name="solutionsDetail"
                  rows={3}
                  defaultValue={draft.solutionsDetail || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Testing & QA</label>
                <textarea
                  name="testing"
                  rows={3}
                  defaultValue={draft.testing || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Metrics & Results</label>
                <textarea
                  name="results"
                  rows={3}
                  defaultValue={draft.results || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Lessons Learned</label>
                <textarea
                  name="lessonsLearned"
                  rows={3}
                  defaultValue={draft.lessonsLearned || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. External References */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <LinkIcon size={16} className="text-[var(--a-primary)]" />
            External References & Links
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Live Demo URL</label>
              <input
                type="url"
                name="liveDemoUrl"
                defaultValue={draft.liveDemoUrl || ""}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">GitHub Repository URL</label>
              <input
                type="url"
                name="githubUrl"
                defaultValue={draft.githubUrl || ""}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Research Report URL</label>
              <input
                type="text"
                name="reportUrl"
                defaultValue={draft.reportUrl || ""}
                placeholder="/documents/report.pdf"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Documentation URL</label>
              <input
                type="url"
                name="documentationUrl"
                defaultValue={draft.documentationUrl || ""}
                placeholder="https://docs.example.com"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Video Demo URL</label>
              <input
                type="url"
                name="videoUrl"
                defaultValue={draft.videoUrl || ""}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Presentation Deck URL</label>
              <input
                type="url"
                name="presentationUrl"
                defaultValue={draft.presentationUrl || ""}
                placeholder="https://slideshare.net/..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
          </div>
        </div>

        {/* 6. Gallery Manager Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <ImageIcon size={16} className="text-[var(--a-primary)]" />
            Project Images Gallery
          </h3>
          <p className="text-[11px] text-[var(--a-soft)] -mt-2">Select existing media assets to include in the visual gallery.</p>

          <GalleryManager
            initialItems={project.images.map((img) => ({
              mediaId: img.mediaId,
              url: img.media.url,
              filename: img.media.filename,
              caption: img.caption || "",
            }))}
          />
        </div>

        {/* 7. SEO Configurations */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <FileText size={16} className="text-[var(--a-primary)]" />
            Search Engine Optimisation (SEO)
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">SEO Page Title Override</label>
              <input
                type="text"
                name="seoTitle"
                defaultValue={draft.seoTitle || ""}
                placeholder="Alternative title tag..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">SEO Page Description</label>
              <input
                type="text"
                name="seoDescription"
                defaultValue={draft.seoDescription || ""}
                placeholder="Meta description content..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
          >
            <Save size={14} />
            Save Case Study
          </button>
          <Link
            href="/admin/projects"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
