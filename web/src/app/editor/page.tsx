import { CloudResumeDock } from "@/components/editor/CloudResumeDock";
import { EditorHero } from "@/components/editor/EditorHero";
import { EditorStatusStrip } from "@/components/editor/EditorStatusStrip";
import { ActiveResumeModule } from "@/components/editor/ResumeModuleConsoles";
import { PreviewToggle } from "@/components/editor/PreviewToggle";
import { ResumePreview } from "@/components/editor/ResumePreview";
import { ResumeThemePanel } from "@/components/editor/ResumeThemePanel";
import { TacticalNav } from "@/components/editor/TacticalNav";

export default function EditorPage() {
  return (
    <main className="tactical-grid h-screen overflow-hidden text-slate-100">
      <div className="flex h-full min-w-[1180px]">
        <TacticalNav />

        <section className="relative z-10 flex min-w-0 flex-1 flex-col">
          <EditorStatusStrip />
          <div className="tactical-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <EditorHero />
              <CloudResumeDock />
              <ResumeThemePanel />
              <ActiveResumeModule />
            </div>
          </div>
        </section>

        <ResumePreview />
        <PreviewToggle variant="dock" />
      </div>
    </main>
  );
}
