import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PremiumUpsell: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] px-4 text-center">
      <Crown className="w-16 h-16 text-yellow-500 mb-6" />
      <h2 className="text-2xl font-bold mb-3 text-foreground">
        Projects are available for Premium users only.
      </h2>
      <p className="text-muted-foreground mb-8">
        Upgrade to Premium to unlock this feature and supercharge your repair process!
      </p>
      <Button
        onClick={() => navigate("/premium")}
        className="bg-primary text-primary-foreground text-lg px-8 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all"
      >
        Upgrade to Premium
      </Button>
    </div>
  );
};

export default PremiumUpsell;
