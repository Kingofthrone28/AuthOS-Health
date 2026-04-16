import { DetailRow } from "@/components/atoms/DetailRow";

interface InsuranceSnapshotProps {
  payerName: string;
  planName?: string | undefined;
  memberId?: string | undefined;
  groupId?: string | undefined;
  payerCaseRef?: string | undefined;
  authNumber?: string | undefined;
}

export function InsuranceSnapshot({ payerName, planName, memberId, groupId, payerCaseRef, authNumber }: InsuranceSnapshotProps) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Insurance</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Payer"     value={payerName} />
        <DetailRow label="Plan"      value={planName} />
        <DetailRow label="Member ID" value={memberId} />
        <DetailRow label="Group ID"  value={groupId} />
        {payerCaseRef && <DetailRow label="Payer Ref" value={payerCaseRef} />}
        {authNumber   && <DetailRow label="Auth #"    value={authNumber} highlight />}
      </dl>
    </section>
  );
}
