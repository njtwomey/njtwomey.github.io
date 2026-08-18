import { GithubIcon, LinkedinIcon, OrcidIcon, ScholarIcon } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { socials, type SocialLink } from "@/content/site";
import { cn } from "@/lib/utils";

const ICONS: Record<SocialLink["icon"], React.ComponentType<{ className?: string }>> = {
  scholar: ScholarIcon,
  orcid: OrcidIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
};

export function SocialLinks({ className, size = "default" }: { className?: string; size?: "default" | "sm" }) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {socials.map((social) => {
        const Icon = ICONS[social.icon];
        return (
          <li key={social.label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={social.href}
                  target="_blank"
                  rel="me noreferrer"
                  aria-label={social.label}
                  className={cn(
                    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    size === "sm" ? "size-8" : "size-9",
                  )}
                >
                  <Icon className={size === "sm" ? "size-4" : "size-[1.125rem]"} />
                </a>
              </TooltipTrigger>
              <TooltipContent>{social.label}</TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
