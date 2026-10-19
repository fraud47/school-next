"use client";

import { useEffect, useState } from "react";

export function SchoolBrand({ className = "", logoClassName = "" }: { className?: string; logoClassName?: string }) {
  const [identity, setIdentity] = useState<{ name: string; logoData: string | null }>({ name: "Your School", logoData: null });

  useEffect(() => {
    let active = true;
    fetch("/api/school-identity")
      .then((response) => response.ok ? response.json() as Promise<{ name: string; logoData: string | null }> : null)
      .then((result) => { if (active && result) setIdentity(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {identity.logoData ? <img alt="" className={`shrink-0 object-contain ${logoClassName}`} src={identity.logoData} /> : null}
      <span className="truncate">{identity.name || "Your School"}</span>
    </span>
  );
}
