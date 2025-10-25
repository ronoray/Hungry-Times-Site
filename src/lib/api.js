export async function fetchMenu() {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/public/menu", { cache: "no-store" });
    if (!res.ok) throw new Error("Menu load failed");
    const json = await res.json();
    // Ensure a stable shape even if backend is empty
    return {
      version: 1,
      categories: Array.isArray(json?.categories) ? json.categories : []
    };
  } catch (e) {
    console.error("fetchMenu error:", e);
    // Fallback shape so UI never crashes
    return { version: 1, categories: [] };
  }
}