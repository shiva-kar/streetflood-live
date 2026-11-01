import { useState } from "react";
import type { ShelterOperations } from "@/lib/shelters/occupancyManager";
import { allocateShelterBeds, shelterCanAccept } from "@/lib/shelters/occupancyManager";

export function ShelterTriageModal({ shelter, onChange }: { shelter: ShelterOperations; onChange: (shelter: ShelterOperations) => void }) {
  const [people, setPeople] = useState(1);
  const [wheelchair, setWheelchair] = useState(false);
  const [pets, setPets] = useState(false);
  const canAccept = shelterCanAccept(shelter, { people, wheelchair, pets });
  return (
    <section aria-label="Shelter triage" className="rounded-2xl border-2 p-4">
      <h2 className="font-bold">Shelter triage</h2>
      <p className="text-sm text-muted-foreground">{Math.max(0, shelter.totalCapacity - shelter.currentHeadcount)} places available</p>
      <label className="mt-3 block text-sm">People<input className="mt-1 h-11 w-full rounded-md border px-3" type="number" min={1} value={people} onChange={(event) => setPeople(Number(event.target.value))} /></label>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={wheelchair} onChange={(event) => setWheelchair(event.target.checked)} /> Wheelchair access required</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={pets} onChange={(event) => setPets(event.target.checked)} /> Companion animal sheltering required</label>
      <button type="button" disabled={!canAccept} onClick={() => onChange(allocateShelterBeds(shelter, people))} className="mt-3 min-h-11 w-full rounded-lg bg-emerald-600 px-4 font-bold text-white disabled:opacity-50">Reserve places</button>
    </section>
  );
}
