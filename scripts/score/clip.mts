/**
 * CLIP image/text embeddings via transformers.js (ONNX, CPU). Used without training: to measure how
 * close a design is to each tradition in the corpus and to every individual museum object.
 */
import { AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";

export const MODEL = "Xenova/clip-vit-base-patch32";
let vision: any, processor: any, textModel: any, tokenizer: any;

const norm = (v: Float32Array) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; return Float32Array.from(v, (x) => x / s); };
export const cos = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!; return s; };

export async function embedImage(bytes: Uint8Array): Promise<Float32Array> {
  vision ??= await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "q8" });
  processor ??= await AutoProcessor.from_pretrained(MODEL);
  const img = await RawImage.fromBlob(new Blob([bytes]));
  const { image_embeds } = await vision(await processor(img));
  return norm(image_embeds.data as Float32Array);
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  textModel ??= await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: "q8" });
  tokenizer ??= await AutoTokenizer.from_pretrained(MODEL);
  const { text_embeds } = await textModel(tokenizer(texts, { padding: true, truncation: true }));
  const d = text_embeds.dims[1] as number, data = text_embeds.data as Float32Array;
  return texts.map((_, i) => norm(data.slice(i * d, (i + 1) * d)));
}

export function centroid(vs: Float32Array[]): Float32Array {
  const c = new Float32Array(vs[0]!.length);
  for (const v of vs) for (let i = 0; i < c.length; i++) c[i]! += v[i]!;
  return norm(c);
}

export const toB64 = (v: Float32Array) => Buffer.from(new Float32Array(v).buffer).toString("base64");
export const fromB64 = (s: string) => new Float32Array(Buffer.from(s, "base64").buffer.slice(0));
