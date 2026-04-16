import { CasesTable } from "@/components/organisms/CasesTable";
import { CasesFiltersBar } from "@/features/cases/presentation/CasesFiltersBar";
import type { CasesFilters } from "../types";

interface CasesPageProps {
  filters: CasesFilters;
}

export function CasesPage({ filters }: CasesPageProps) {
  return (
    <div className="space-y-4">
      <CasesFiltersBar filters={filters} />
      <CasesTable filters={filters} />
    </div>
  );
}
