// Resolves a mix of existing portal ids and freeform custom portal names into
// a single list of portal ids, upserting-by-name for anything new. Lets a
// non-admin add a portal inline without going through the admin-gated
// POST /api/portals route.
async function resolvePortalIds(supabase, portalIds = [], customNames = []) {
  const ids = new Set(portalIds.filter(Boolean));

  for (const raw of customNames) {
    const name = raw?.trim();
    if (!name) continue;

    const { data, error } = await supabase
      .from("portals")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();

    if (error) throw error;
    ids.add(data.id);
  }

  return Array.from(ids);
}

module.exports = { resolvePortalIds };
