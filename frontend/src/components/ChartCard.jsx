import { useRef } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function ChartCard({ title, subtitle, filename, children, testid }) {
  const ref = useRef(null);
  const download = async () => {
    try {
      const url = await toPng(ref.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
    } catch {
      toast.error("Gagal mengunduh grafik");
    }
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 rise" data-testid={testid}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div />
        <button onClick={download} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-900 hover:text-white transition-colors" data-testid={`${testid}-download-png`}>
          <Download className="h-3.5 w-3.5" />Unduh PNG
        </button>
      </div>
      <div ref={ref} className="px-5 pb-5 pt-1 bg-white">
        <h3 className="font-heading font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
        <div className="h-[320px]">{children}</div>
      </div>
    </div>
  );
}
