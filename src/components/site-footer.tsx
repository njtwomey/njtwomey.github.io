import { SocialLinks } from "@/components/social-links";
import { site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t">
      <div className="mx-auto flex w-full max-w-4xl flex-col-reverse items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-6">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} {site.name}
        </p>
        <SocialLinks size="sm" />
      </div>
    </footer>
  );
}
