interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "red" | "yellow" | "purple" | "navy" | "gold";
}

const colorClasses = {
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40",
    icon: "bg-blue-500 text-white",
    text: "text-blue-700 dark:text-blue-300",
    title: "text-gray-600 dark:text-blue-200",
    border: "border-blue-200 dark:border-blue-700",
  },
  green: {
    bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40",
    icon: "bg-green-500 text-white",
    text: "text-green-700 dark:text-green-300",
    title: "text-gray-600 dark:text-green-200",
    border: "border-green-200 dark:border-green-700",
  },
  red: {
    bg: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40",
    icon: "bg-red-500 text-white",
    text: "text-red-700 dark:text-red-300",
    title: "text-gray-600 dark:text-red-200",
    border: "border-red-200 dark:border-red-700",
  },
  yellow: {
    bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/40 dark:to-yellow-800/40",
    icon: "bg-yellow-500 text-white",
    text: "text-yellow-700 dark:text-yellow-300",
    title: "text-gray-600 dark:text-yellow-200",
    border: "border-yellow-200 dark:border-yellow-700",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40",
    icon: "bg-purple-500 text-white",
    text: "text-purple-700 dark:text-purple-300",
    title: "text-gray-600 dark:text-purple-200",
    border: "border-purple-200 dark:border-purple-700",
  },
  navy: {
    bg: "bg-gradient-to-br from-slate-50 to-blue-100 dark:from-slate-900/40 dark:to-blue-800/40",
    icon: "bg-ppa-navy text-white",
    text: "text-ppa-navy dark:text-blue-300",
    title: "text-gray-600 dark:text-blue-200",
    border: "border-ppa-navy/20 dark:border-blue-700",
  },
  gold: {
    bg: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-800/40",
    icon: "bg-accent-gold text-white",
    text: "text-amber-700 dark:text-amber-300",
    title: "text-gray-600 dark:text-amber-200",
    border: "border-accent-gold/30 dark:border-amber-700",
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
    <div className={`${colors.bg} rounded-xl p-6 border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${colors.title} mb-1`}>{title}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center shadow-md`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={icon}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
