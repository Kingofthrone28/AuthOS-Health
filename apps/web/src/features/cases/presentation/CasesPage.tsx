import { CasesTable } from "@/components/organisms/CasesTable";
import { CasesFiltersBar } from "@/features/cases/presentation/CasesFiltersBar";
import type { CaseRowViewModel, CasesFilters } from "../types";

interface CasesPageProps {
  cases: CaseRowViewModel[];
  filters: CasesFilters;
  total: number;
}

export function CasesPage({ cases, filters, total }: CasesPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-700">{cases.length}</span> of{" "}
          <span className="font-medium text-gray-700">{total}</span> cases
        </p>
      </div>

      <CasesFiltersBar filters={filters} />
      <CasesTable cases={cases} />
    </div>
  );
}
