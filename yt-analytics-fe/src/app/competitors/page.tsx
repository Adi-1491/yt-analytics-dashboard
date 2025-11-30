"use client"
import dynamic from "next/dynamic";

const CompetitorCompare = dynamic(() => import("../components/CompetitorCompare"), { ssr: false });

export default function Page() {
  return (
    <div className="p-4">
      <CompetitorCompare
        defaultChannels={[]}
      />
    </div>
  );
}
