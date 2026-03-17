type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<string, MigrationFn> = {
  "1.0→1.1": (data) => {
    const job = data.job as Record<string, unknown> | undefined;
    const companyName = (job?.companyName as string) ?? "星辰互联";
    const npcs = ((data.npcs as Array<Record<string, unknown>> | undefined) ?? []).map(
      (npc) => ({
        ...npc,
        companyName: (npc.companyName as string | undefined) ?? companyName,
      }),
    );

    return {
      ...data,
      version: "1.1",
      phase2Path: null,
      executive: null,
      maimaiPosts: [],
      maimaiPostsThisQuarter: 0,
      jobOffers: [],
      jobHistory: [],
      npcs,
    };
  },
};
const VERSION_CHAIN = ["1.0", "1.1"];

export function migrate(
  data: Record<string, unknown>,
  targetVersion: string,
): Record<string, unknown> | null {
  const currentVersion = data.version as string | undefined;

  if (currentVersion === targetVersion) {
    return data;
  }

  const fromIndex = VERSION_CHAIN.indexOf(currentVersion ?? "");
  const toIndex = VERSION_CHAIN.indexOf(targetVersion);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return null;
  }

  let result = { ...data };
  for (let index = fromIndex; index < toIndex; index += 1) {
    const migrationKey = `${VERSION_CHAIN[index]}→${VERSION_CHAIN[index + 1]}`;
    const migration = MIGRATIONS[migrationKey];
    if (!migration) {
      return null;
    }

    result = migration(result);
  }

  return result;
}
