Usage

```bash
# Build the seeder
go build -o seed ./cmd/seed/

# Run with defaults (creates admin / admin123)
./seed
# Output: Seed user created: username=admin

# Run with custom credentials
SEED_USERNAME=root SEED_PASSWORD=supersecret ./seed
# Output: Seed user created: username=root

# Running again is safe
./seed
# Output: Users table already populated — nothing to seed.
