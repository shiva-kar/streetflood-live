import type { ShelterOperations } from "@/lib/shelters/occupancyManager";

export function ShelterInventoryView({ shelter }: { shelter: ShelterOperations }) {
  return <section aria-label="Shelter inventory" className="rounded-2xl border-2 p-4"><h2 className="font-bold">Shelter inventory</h2><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Water</dt><dd className="font-bold">{shelter.drinkingWaterLiters} L</dd></div><div><dt className="text-muted-foreground">Meals</dt><dd className="font-bold">{shelter.mealPackets}</dd></div><div><dt className="text-muted-foreground">Generator</dt><dd className="font-bold">{shelter.generatorHours} h</dd></div><div><dt className="text-muted-foreground">Formula</dt><dd className="font-bold">{shelter.pediatricFormulaUnits}</dd></div></dl></section>;
}
