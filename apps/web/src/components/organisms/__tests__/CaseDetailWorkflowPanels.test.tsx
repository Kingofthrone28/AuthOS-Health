import { renderToStaticMarkup } from "react-dom/server";
import { CaseTaskList } from "../CaseTaskList";
import { RequirementsChecklist } from "../RequirementsChecklist";

const requirements = [
  { id: "requirement-1", description: "Consult notes", required: true, completed: true },
];
const tasks = [
  { id: "task-1", type: "collect", description: "Collect consult notes" },
];

describe("case detail workflow panels", () => {
  it.each(["approved", "denied", "closed"])(
    "hides requirements for terminal status %s",
    (caseStatus) => {
      const html = renderToStaticMarkup(
        <RequirementsChecklist
          requirements={requirements}
          caseId="case-1"
          caseStatus={caseStatus}
        />,
      );

      expect(html).toBe("");
    },
  );

  it("renders completed requirements before payer submission", () => {
    const html = renderToStaticMarkup(
      <RequirementsChecklist
        requirements={requirements}
        caseId="case-1"
        caseStatus="ready_to_submit"
      />,
    );

    expect(html).toContain("Requirements");
    expect(html).toContain("1/1 complete");
  });

  it("hides task panels once no open tasks remain or the case is terminal", () => {
    expect(renderToStaticMarkup(
      <CaseTaskList tasks={[]} caseId="case-1" caseStatus="ready_to_submit" />,
    )).toBe("");
    expect(renderToStaticMarkup(
      <CaseTaskList tasks={tasks} caseId="case-1" caseStatus="approved" />,
    )).toBe("");
  });
});
