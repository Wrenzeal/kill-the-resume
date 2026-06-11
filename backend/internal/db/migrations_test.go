package db

import "testing"

func TestAppMigrationsAreUniquelyOrdered(t *testing.T) {
	seen := map[string]struct{}{}
	previous := ""
	for _, migration := range appMigrations {
		if migration.version == "" {
			t.Fatal("migration version must not be empty")
		}
		if migration.description == "" {
			t.Fatalf("migration %s description must not be empty", migration.version)
		}
		if migration.run == nil {
			t.Fatalf("migration %s run function must not be nil", migration.version)
		}
		if _, exists := seen[migration.version]; exists {
			t.Fatalf("migration %s is duplicated", migration.version)
		}
		if previous != "" && migration.version <= previous {
			t.Fatalf("migration %s must be ordered after %s", migration.version, previous)
		}
		seen[migration.version] = struct{}{}
		previous = migration.version
	}
}
