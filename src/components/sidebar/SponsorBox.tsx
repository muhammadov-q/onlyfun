"use client";

import Image from "next/image";

export function SponsorBox() {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
      <Image
        src="/sponsor.png"
        alt="This week's sponsor – Take & Go"
        width={320}
        height={320}
        className="w-full h-auto block"
      />
    </div>
  );
}
