import { CheckCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MPS_INFO =
  "Muscle protein synthesis (MPS) is the process that builds and repairs muscle. To maximize it, space protein-rich meals 3–4 hours apart. Each spike (e.g. 20g+ protein per meal) stimulates MPS; spreading them through the day keeps MPS elevated longer than one large meal.";

export interface TimelineSlot {
  time: string;
  label: string;
  filled: boolean; // true = protein spike achieved (fill circle)
  isNextTarget?: boolean; // first empty slot = next recommended time
}

interface MPSScoreProps {
  spikes: number;
  target: number;
  nextWindow: string;
  slots: TimelineSlot[]; // exactly 4 slots, evenly spaced; fill left to right by achieved spikes
}

const MPS_TIMELINE_SLOTS = 4;

const MPSScore = ({ spikes, target, nextWindow, slots }: MPSScoreProps) => {
  const displaySlots =
    slots.length >= MPS_TIMELINE_SLOTS
      ? slots.slice(0, MPS_TIMELINE_SLOTS)
      : Array.from({ length: MPS_TIMELINE_SLOTS }, (_, i) => ({
          time: "—",
          label: "—",
          filled: false,
          isNextTarget: false,
        }));

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
        <span className="text-sm font-bold">MPS Score</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="What is MPS?"
            >
              <Info className="w-4 h-4 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] text-left">
            <p className="leading-relaxed">{MPS_INFO}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-display">{spikes}</span>
        <span className="text-lg text-muted-foreground">/ {target}</span>
        <span className="text-sm text-muted-foreground ml-1">Protein Spikes</span>
      </div>

      {/* Fixed line with 4 evenly spaced points; line runs from 1st to last circle center */}
      <div className="mt-4">
        {/* Row 1: time labels */}
        <div className="flex w-full">
          {displaySlots.map((slot, i) => (
            <div key={`time-${i}`} className="flex-1 flex justify-center min-w-0">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide text-center leading-tight ${
                  slot.isNextTarget ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {slot.time}
              </span>
            </div>
          ))}
        </div>
        {/* Row 2: line + circles in same row so they share vertical center */}
        <div className="relative flex w-full h-3 mt-1.5 items-center">
          {/* Line from center of 1st circle to center of 4th circle */}
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-primary/50 rounded-full pointer-events-none z-0"
            style={{ left: "12.5%", right: "12.5%" }}
            aria-hidden
          />
          {displaySlots.map((slot, i) => (
            <div key={`circle-${i}`} className="flex-1 flex justify-center items-center z-10">
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  slot.filled ? "border-primary bg-primary" : "border-primary bg-background"
                }`}
              />
            </div>
          ))}
        </div>
        {/* Row 3: labels */}
        <div className="flex w-full mt-1">
          {displaySlots.map((slot, i) => (
            <div key={`label-${i}`} className="flex-1 flex justify-center min-w-0 px-0.5">
              <span
                className={`text-[10px] text-center leading-tight line-clamp-2 min-h-[28px] ${
                  slot.isNextTarget ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {slot.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {spikes < target && (
        <p className="text-xs text-muted-foreground mt-2">
          Next target: {nextWindow}
        </p>
      )}
    </div>
  );
};

export default MPSScore;
