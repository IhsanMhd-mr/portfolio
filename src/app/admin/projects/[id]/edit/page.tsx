import db from "@/lib/database";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Save, Briefcase, Trash2, Eye } from "lucide-react";

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
  });

  if (!project || project.deletedAt) {
    notFound();
  }

  // Server action to save project case study modifications
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

    const startDateInput = formData.get("startDate") as string;
    const endDateInput = formData.get("endDate") as string;
    const startDate = startDateInput ? new Date(startDateInput) : null;
    const endDate = endDateInput ? new Date(endDateInput) : null;

    const showOnHomepage = formData.get("showOnHomepage") === "on";
    const featured = formData.get("featured") === "on";

    await db.project.update({
      where: { id: projId },
      data: {
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
        startDate,
        endDate,
        showOnHomepage,
        featured,
      },
    });

    // Mark changes on page
    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projId}/edit`);
    redirect("/admin/projects");
  }

  // Format dates for input default values
  const defaultStartDate = project.startDate ? project.startDate.toISOString().substring(0, 10) : "";
  const defaultEndDate = project.endDate ? project.endDate.toISOString().substring(0, 10) : "";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/projects"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-slate-100 rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Case Study</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1">Configure project layout context and detail write-ups.</p>
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
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Project Title</label>
              <input
                type="text"
                name="title"
                required
                defaultValue={project.title}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Dynamic URL Slug</label>
              <input
                type="text"
                name="slug"
                required
                defaultValue={project.slug}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Summary Description</label>
            <input
              type="text"
              name="summary"
              required
              defaultValue={project.summary}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Category</label>
              <select
                name="category"
                defaultValue={project.category}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
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
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Status</label>
              <select
                name="status"
                defaultValue={project.status}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PLANNED">Planned</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Start Date</label>
              <input
                type="date"
                name="startDate"
                defaultValue={defaultStartDate}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">End Date</label>
              <input
                type="date"
                name="endDate"
                defaultValue={defaultEndDate}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 pt-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="showOnHomepage" defaultChecked={project.showOnHomepage} />
              <label className="text-xs font-semibold text-[var(--a-soft)]">Render on Home Page</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="featured" defaultChecked={project.featured} />
              <label className="text-xs font-semibold text-[var(--a-soft)]">Set as Featured work</label>
            </div>
          </div>
        </div>

        {/* 2. Detailed Case Study Card */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Eye size={16} className="text-[var(--a-primary)]" />
            Detailed Biography & Study Analysis
          </h3>

          <div className="space-y-4">
            {/* My Role */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">My Role / Responsibilities</label>
              <input
                type="text"
                name="myRole"
                defaultValue={project.myRole || ""}
                placeholder="Sole Developer, Technical Lead, Designer"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            {/* Problem */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">The Problem</label>
              <textarea
                name="problem"
                rows={3}
                defaultValue={project.problem || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            {/* Solution */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">The Solution</label>
              <textarea
                name="solution"
                rows={3}
                defaultValue={project.solution || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            {/* Key Features */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Key Features (new line list)</label>
              <textarea
                name="mainFeatures"
                rows={3}
                defaultValue={project.mainFeatures || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            {/* System Architecture */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">System Architecture Write-up</label>
              <textarea
                name="systemArchitecture"
                rows={3}
                defaultValue={project.systemArchitecture || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            {/* Development Process */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Development Process</label>
              <textarea
                name="developmentProcess"
                rows={3}
                defaultValue={project.developmentProcess || ""}
                className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Challenges */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Challenges Faced</label>
                <textarea
                  name="challenges"
                  rows={3}
                  defaultValue={project.challenges || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
                />
              </div>

              {/* Solutions Detail */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Detailed Solutions</label>
                <textarea
                  name="solutionsDetail"
                  rows={3}
                  defaultValue={project.solutionsDetail || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Testing */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Testing QA</label>
                <textarea
                  name="testing"
                  rows={3}
                  defaultValue={project.testing || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
                />
              </div>

              {/* Results */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Metrics & Results</label>
                <textarea
                  name="results"
                  rows={3}
                  defaultValue={project.results || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
                />
              </div>

              {/* Lessons Learned */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Lessons Learned</label>
                <textarea
                  name="lessonsLearned"
                  rows={3}
                  defaultValue={project.lessonsLearned || ""}
                  className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. External Links */}
        <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Save size={16} className="text-[var(--a-primary)]" />
            External References & Repositories
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Live Demo Link</label>
              <input
                type="url"
                name="liveDemoUrl"
                defaultValue={project.liveDemoUrl || ""}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 border border-solid border-[var(--line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">GitHub URL</label>
              <input
                type="url"
                name="githubUrl"
                defaultValue={project.githubUrl || ""}
                placeholder="https://github.com/..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Report Document URL</label>
              <input
                type="text"
                name="reportUrl"
                defaultValue={project.reportUrl || ""}
                placeholder="/documents/report.pdf"
                className="w-full px-3 py-1.5 border border-solid border-[var(--line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Form controls */}
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
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-slate-50 transition-colors text-xs font-semibold"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
