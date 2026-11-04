"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/hooks/use-copy";
import { buildAiContext } from "@/lib/developer-docs";

export function CopyAiContextButton({ baseUrl }: { baseUrl: string }) {
  const { copied, copy } = useCopy(2_400);
  const { success } = useToast();

  const onCopy = async () => {
    await copy(buildAiContext(baseUrl));
    success("คัดลอก context สำหรับ AI แล้ว — วางใน AI Agent เพื่อเริ่มพัฒนาได้เลย", {
      title: "For AI Agent",
    });
  };

  return (
    <Button
      size="sm"
      onClick={() => void onCopy()}
      icon={copied ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
      title="คัดลอก prompt context (Markdown) สำหรับ AI Agent"
      aria-label="คัดลอก prompt context สำหรับ AI Agent"
    >
      {copied ? "คัดลอกแล้ว" : "For AI Agent"}
    </Button>
  );
}
