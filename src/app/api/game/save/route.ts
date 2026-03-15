export async function GET() {
  return Response.json({
    message:
      "Save/load is handled client-side via LocalStorage. Use the save module directly.",
    slots: ["auto", "slot1", "slot2", "slot3"],
  });
}
