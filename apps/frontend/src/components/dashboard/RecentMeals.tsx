import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface MealSummary {
  id: number;
  logged_at: string;
  protein_g: number;
  dish_name?: string | null;
  label: string;
}

interface RecentMealsProps {
  meals: MealSummary[];
}

const RecentMeals = ({ meals }: RecentMealsProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-muted-foreground px-1">Recent Meals</h3>
      {meals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No meals logged today yet</p>
      ) : (
        meals.map((meal) => (
          <div
            key={meal.id}
            onClick={() => navigate(`/meal/${meal.id}`)}
            className="card-subtle flex items-center justify-between gap-2 px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <span className="text-muted-foreground shrink-0">•</span>
            <span className="text-sm font-medium min-w-0 flex-1">
              {(meal.dish_name || meal.label) && (meal.dish_name || meal.label) !== "Meal" ? (
                <>
                  <span className="font-medium capitalize">{meal.dish_name || meal.label}</span>
                  <span className="text-muted-foreground font-normal"> · </span>
                  <span className="text-primary font-bold">{Math.round(meal.protein_g)}g protein</span>
                </>
              ) : (
                <span className="text-primary font-bold">{Math.round(meal.protein_g)}g protein</span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        ))
      )}
    </div>
  );
};

export default RecentMeals;
