import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}

const ActionCard = ({ icon: Icon, title, description, onClick }: ActionCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-card transition-all duration-200 border-0 shadow-card bg-gradient-card"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-gradient-primary rounded-full mb-4">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionCard;