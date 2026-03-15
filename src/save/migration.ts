type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<string, MigrationFn> = {};
const VERSION_CHAIN = ["1.0"];

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
