import React from "react";
import Card from "./ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatsCard({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  trend, 
  trendDirection = "up" 
}) {
  const isUp = trendDirection === "up";

  return (
    <Card className="hover:border-[#3F3F46] hover:-translate-y-[1px] transition-all duration-150 relative overflow-hidden group select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#A1A1AA] tracking-tight">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors duration-150" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      {description && <p className="text-[10px] text-[#A1A1AA] mt-1">{description}</p>}
    </Card>
  );
}
