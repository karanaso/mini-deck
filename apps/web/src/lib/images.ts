import { AppError } from "@/lib/app-error";

const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  const existing = cache.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => {
      cache.delete(url);
      reject(new AppError("errors.export.image", `Could not load image: ${url}`));
    };
    image.src = url;
  });
  cache.set(url, promise);
  return promise;
}

export function clearImageCache(): void {
  cache.clear();
}
