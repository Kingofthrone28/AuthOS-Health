import { CasesPage } from "../presentation/CasesPage";
import type { CasesFilters } from "../types";

interface CasesPageContainerProps {
  filters: CasesFilters;
}

export function CasesPageContainer({ filters }: CasesPageContainerProps) {
  return <CasesPage filters={filters} />;
}
