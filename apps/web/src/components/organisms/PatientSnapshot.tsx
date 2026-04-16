import { DetailRow } from "@/components/atoms/DetailRow";

interface PatientSnapshotProps {
  name: string;
  dob?: string | undefined;
  gender?: string | undefined;
  mrn?: string | undefined;
}

export function PatientSnapshot({ name, dob, gender, mrn }: PatientSnapshotProps) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Patient</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Name"   value={name} />
        <DetailRow label="DOB"    value={dob} />
        <DetailRow label="Gender" value={gender} />
        <DetailRow label="MRN"    value={mrn} />
      </dl>
    </section>
  );
}
