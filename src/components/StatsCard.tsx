interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "red" | "yellow" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-700",
  },
  green: {
    bg: "bg-green-50",
    icon: "bg-green-100 text-green-600",
    text: "text-green-700",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    text: "text-red-700",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "bg-yellow-100 text-yellow-600",
    text: "text-yellow-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    text: "text-purple-700",
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={icon}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
