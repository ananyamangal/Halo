"use client";

import { MemberProvider } from "@/lib/member/store";
import Shell from "@/components/member/Shell";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberProvider>
      <Shell>{children}</Shell>
    </MemberProvider>
  );
}
