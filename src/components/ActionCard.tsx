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
      className="cursor-pointer hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 border-border shadow-card bg-card group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-primary rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-sm mb-1 text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-tight">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionCard;