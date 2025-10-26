
import { Card, CardContent } from '@/components/ui/card';

interface CircuitCardProps {
  title: string;
  description: string;
  onClick?: () => void;
  icon?: string; // Change to string for image path
  backgroundImage?: string; // New prop for background image
  bgColorClass?: string; // Custom background color class for the icon container
  iconColorClass?: string; // Custom icon color class
  cardBgClass?: string; // New prop for custom card background class
  textColorClass?: string; // New prop for custom text color class
  button?: React.ReactNode; // New prop for a button or other React node
  footerText?: React.ReactNode; // New prop for additional text at the bottom
  titleColorClass?: string; // New prop for custom title color class
  descriptionColorClass?: string; // New prop for custom description color class
  abstractDesignImage?: string; // New prop for the abstract design SVG
}

const CircuitCard = ({
  title,
  description,
  onClick,
  icon, // No default icon
  backgroundImage,
  iconColorClass = "text-white", // Default icon color
  cardBgClass = "bg-card", // Default card background
  textColorClass = "text-foreground", // Default text color
  button, // Destructure the new button prop
  footerText, // Destructure the new footerText prop
  titleColorClass = "text-foreground", // Default title color
  descriptionColorClass = "text-muted-foreground", // Default description color
  abstractDesignImage // Destructure the new abstractDesignImage prop
}: CircuitCardProps) => {
  return (
    <Card
      className={`relative cursor-pointer hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 border-border shadow-card group overflow-hidden ${cardBgClass}`}
      onClick={onClick}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      {abstractDesignImage && (
        <img
          src={abstractDesignImage}
          alt="Abstract Design"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}
      <CardContent className="p-4 relative z-10">
        <div className="flex flex-col items-start text-left">
          {button && <div className="mb-3">{button}</div>} {/* Render the button if provided */}
          <div className="flex items-center mb-1">
            {icon ? (
              <img src={icon} alt="icon" className={`h-6 w-6 ${iconColorClass}`} />
            ) : (
              <></> // Render nothing if no icon is provided
            )}
          </div>
          <h3 className={`font-semibold text-lg mb-1 ${titleColorClass}`}>{title}</h3>
          <p className={`text-sm leading-tight ${descriptionColorClass}`}>{description}</p>
          {footerText && footerText} {/* Render the footer text if provided */}
        </div>
      </CardContent>
    </Card>
  );
};

export default CircuitCard;
