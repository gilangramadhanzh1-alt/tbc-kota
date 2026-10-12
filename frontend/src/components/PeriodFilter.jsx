import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilter } from "@/context/AppContext";
import { PERIOD_TYPES, YEARS, periodOptions } from "@/lib/period";

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-[140px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function SimpleSelect({ value, onChange, options, testid, className = "" }) {
  return (
    <Select value={String(value)} onValueChange={onChange}>
      <SelectTrigger className={`bg-white h-10 ${className}`} data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={String(o.value)} data-testid={`${testid}-option-${o.value}`}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PeriodFilter({ showUnit = true }) {
  const { filter, setFilter } = useFilter();
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4" data-testid="period-filter">
      <Field label="Tahun">
        <SimpleSelect testid="filter-tahun-select" value={filter.year} onChange={(v) => setFilter({ year: Number(v) })} options={YEARS.map((y) => ({ value: y, label: String(y) }))} />
      </Field>
      <Field label="Periode">
        <SimpleSelect testid="filter-periode-select" value={filter.periodType} onChange={(v) => setFilter({ periodType: v, periodIndex: 1 })} options={PERIOD_TYPES} />
      </Field>
      {filter.periodType !== "tahunan" && (
        <Field label="Pilih">
          <SimpleSelect testid="filter-periode-index-select" value={filter.periodIndex} onChange={(v) => setFilter({ periodIndex: Number(v) })} options={periodOptions(filter.periodType)} className="min-w-[160px]" />
        </Field>
      )}
      {showUnit && (
        <Field label="Basis Data">
          <SimpleSelect testid="filter-unit-select" value={filter.unitType} onChange={(v) => setFilter({ unitType: v })} options={[{ value: "kelurahan", label: "Kelurahan" }, { value: "faskes", label: "Faskes" }]} />
        </Field>
      )}
    </div>
  );
}
