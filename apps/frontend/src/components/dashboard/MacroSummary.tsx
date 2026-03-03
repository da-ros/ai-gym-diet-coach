interface MacroSummaryProps {
  calories: number;
  caloriesTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  fats: number;
}

const MacroSummary = ({ calories, caloriesTarget, protein, proteinTarget, carbs, fats }: MacroSummaryProps) => {
  return (
    <div className="card-subtle p-4">
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Calories</p>
          <p className="text-xl font-bold text-display">{calories.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">/ {caloriesTarget.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Protein</p>
          <p className="text-xl font-bold text-display text-primary">{protein}</p>
          <p className="text-xs text-muted-foreground">/ {proteinTarget}g</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Carbs</p>
          <p className="text-xl font-bold text-display">{carbs}</p>
          <p className="text-xs text-muted-foreground">g</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Fats</p>
          <p className="text-xl font-bold text-display">{Math.round(fats)}</p>
          <p className="text-xs text-muted-foreground">g</p>
        </div>
      </div>
    </div>
  );
};

export default MacroSummary;
