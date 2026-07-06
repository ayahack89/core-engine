import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#111111] border border-[#27272A] rounded-xl p-5 h-[230px] flex flex-col justify-between animate-pulse select-none">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-[#1c1c1f]" />
              <div className="h-3.5 bg-[#1c1c1f] rounded w-24" />
              <div className="h-3.5 bg-[#1c1c1f] rounded w-12" />
            </div>
            <div className="h-3 bg-[#1c1c1f] rounded w-full mb-2" />
            <div className="h-3 bg-[#1c1c1f] rounded w-5/6" />
          </div>
          <div className="border-t border-[#27272A] pt-4 mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="h-4 bg-[#1c1c1f] rounded w-16" />
                <div className="h-4 bg-[#1c1c1f] rounded w-10" />
              </div>
              <div className="h-3 bg-[#1c1c1f] rounded w-12" />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="h-3 bg-[#1c1c1f] rounded w-20" />
              <div className="h-7 bg-[#1c1c1f] rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
