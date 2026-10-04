export type DiaryZone = "cover" | "spine" | "border" | "divider" | "emblem";

export interface DiarySynthesisInput {
  seed: string;
  meanings: string[];
  principles: string[];
  zones?: DiaryZone[];
  symmetry?: "bilateral" | "radial" | "translational" | "asymmetric-balanced";
  density?: "restrained" | "balanced" | "complex";
}

export interface DiaryManifest {
  version: "0.1";
  seed: string;
  meanings: string[];
  principles: string[];
  zones: DiaryZone[];
  symmetry: NonNullable<DiarySynthesisInput["symmetry"]>;
  density: NonNullable<DiarySynthesisInput["density"]>;
  recipe: {
    sequence: string[];
    rule: string;
  };
}

export function buildDiaryManifest(input: DiarySynthesisInput): DiaryManifest {
  if (!input.seed?.trim()) throw new Error("seed is required");
  if (!input.meanings?.length) throw new Error("at least one meaning is required");
  if (!input.principles?.length) throw new Error("at least one evidence-backed principle is required");
  return {
    version: "0.1",
    seed: input.seed.trim(),
    meanings: [...new Set(input.meanings)],
    principles: [...new Set(input.principles)],
    zones: input.zones?.length ? [...new Set(input.zones)] : ["cover","spine","border","divider","emblem"],
    symmetry: input.symmetry ?? "bilateral",
    density: input.density ?? "balanced",
    recipe: {
      sequence: ["guard","pulse","satellite","anchor","axis","mirror","guard"],
      rule: "Synthesize original geometry from reviewed principles; never copy a source artifact or culturally restricted motif."
    }
  };
}
