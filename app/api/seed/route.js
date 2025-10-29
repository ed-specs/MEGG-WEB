import { db } from "../../config/firebaseConfig";
import { collection, doc, setDoc } from "firebase/firestore";

// Helper: generate 8-character alphanumeric IDs
function generateEggId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// Helper: random weight generator within egg size ranges
function generateWeight(size) {
  const ranges = {
    small: { min: 35, max: 42.99 },
    medium: { min: 43, max: 50.99 },
    large: { min: 51, max: 58 },
  };
  const { min, max } = ranges[size];
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

export async function GET() {
  try {
    const batchId = "B-971318-0001";
    const accountId = "MEGG-971318";

    // --- Batch document ---
    await setDoc(doc(db, "batches", batchId), {
      accountId,
      createdAt: new Date().toISOString(),
      id: batchId,
      name: `Batch ${batchId}`,
      stats: {
        badEggs: 5,
        dirtyEggs: 8,
        goodEggs: 13,
        largeEggs: 4,
        mediumEggs: 12,
        smallEggs: 10,
        totalEggs: 26,
      },
      status: "ready",
      uid: "pyRvR6S5SVTEJrS049r6iGUZ3xr1",
      updatedAt: new Date().toISOString(),
    });

    // --- Egg documents ---
    const eggs = [];

    // Generate 5 bad eggs
    for (let i = 0; i < 5; i++) {
      eggs.push({
        eggId: generateEggId(),
        quality: "bad",
        size: i < 2 ? "small" : i < 4 ? "medium" : "large",
        weight: generateWeight(i < 2 ? "small" : i < 4 ? "medium" : "large"),
      });
    }

    // Generate 8 dirty eggs
    for (let i = 0; i < 8; i++) {
      eggs.push({
        eggId: generateEggId(),
        quality: "dirty",
        size: i < 3 ? "small" : i < 6 ? "medium" : "large",
        weight: generateWeight(i < 3 ? "small" : i < 6 ? "medium" : "large"),
      });
    }

    // Generate 13 good eggs
    for (let i = 0; i < 13; i++) {
      eggs.push({
        eggId: generateEggId(),
        quality: "good",
        size: i < 5 ? "small" : i < 10 ? "medium" : "large",
        weight: generateWeight(i < 5 ? "small" : i < 10 ? "medium" : "large"),
      });
    }

    // Write all eggs to Firestore
    for (const egg of eggs) {
      await setDoc(doc(db, "eggs", egg.eggId), {
        accountId,
        batchId,
        createdAt: new Date().toISOString(),
        ...egg,
      });
    }

    return Response.json({
      success: true,
      message: `Dummy data seeded! ${eggs.length} eggs added.`,
    });
  } catch (error) {
    console.error("Seeding error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
