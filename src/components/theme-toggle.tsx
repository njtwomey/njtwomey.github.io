import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";

/**
 * One button that flips light and dark.
 *
 * The site follows the system until this is pressed, so someone who has already
 * set a preference on their machine never has to set it again here. Pressing it
 * makes the choice explicit and it sticks.
 *
 * The icon shows the current state rather than the destination, matching how a
 * status indicator behaves everywhere else, and the tooltip and label carry the
 * action so there is no ambiguity about what a press will do.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const dark = resolved === "dark";
  const action = `Switch to ${dark ? "light" : "dark"} theme`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={action} onClick={toggle}>
          {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{action}</TooltipContent>
    </Tooltip>
  );
}
