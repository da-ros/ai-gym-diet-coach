interface MicroStatusProps {
  fiber: number;
  sodium: number;
  potassium: number;
}

const DAILY_TARGETS = {
  fiber: { min: 25, unit: "g", display: "25g" },
  sodium: { min: 1500, max: 3000, unit: "mg", display: "1,500–3,000 mg" },
  potassium: { min: 3000, unit: "mg", display: "3,000 mg" },
} as const;

type FiberPotassiumStatus = "ok" | "on_track";
type SodiumStatus = "low" | "ok" | "high";

const MicroStatus = ({ fiber, sodium, potassium }: MicroStatusProps) => {
  const getFiberStatus = (value: number): FiberPotassiumStatus =>
    value >= 25 ? "ok" : "on_track";

  const getPotassiumStatus = (value: number): FiberPotassiumStatus =>
    value >= 3000 ? "ok" : "on_track";

  const getSodiumStatus = (value: number): SodiumStatus => {
    if (value < 1500) return "low";
    if (value > 3000) return "high";
    return "ok";
  };

  const getStatus = (value: number, type: "fiber" | "sodium" | "potassium") => {
    if (type === "fiber") return getFiberStatus(value);
    if (type === "sodium") return getSodiumStatus(value);
    return getPotassiumStatus(value);
  };

  const getBadgeClass = (status: string) => {
    if (status === "ok") return "status-badge-ok";
    if (status === "high") return "status-badge-high";
    if (status === "on_track") return "status-badge-on-track";
    return "status-badge-low";
  };

  const getBadgeLabel = (status: string) => {
    if (status === "ok") return "OK";
    if (status === "high") return "High";
    if (status === "low") return "Low";
    return "On track";
  };

  const items: { label: string; value: number; valueStr: string; type: "fiber" | "sodium" | "potassium" }[] = [
    { label: "Fiber", value: fiber, valueStr: `${fiber}g`, type: "fiber" },
    { label: "Sodium", value: sodium, valueStr: `${sodium.toLocaleString()} mg`, type: "sodium" },
    { label: "Potassium", value: potassium, valueStr: `${potassium.toLocaleString()} mg`, type: "potassium" },
  ];

  return (
    <div className="card-subtle p-4">
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => {
          const status = getStatus(item.value, item.type);
          const target = DAILY_TARGETS[item.type].display;
          return (
            <div key={item.type} className="text-center">
              <p className="text-xs text-muted-foreground mb-1.5">{item.label}</p>
              <p className="text-xs font-semibold text-foreground">
                {item.valueStr} <span className="text-muted-foreground font-normal">/ {target}</span>
              </p>
              <span className={`status-badge mt-1 ${getBadgeClass(status)}`}>
                {getBadgeLabel(status)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MicroStatus;
