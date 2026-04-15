// scripts/fix-roles-permissions.ts
// Run with: npx tsx scripts/fix-roles-permissions.ts
//
// This script fixes the permission IDs in Firestore appRoles collection.
// The old IDs (dashboard:view, services:view_history, inventory:manage, etc.)
// are mapped to the new IDs from permissions.ts.

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Use env variable or default service account
const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'ranoro-5b4f3',
});
const db = getFirestore(app);

// Map OLD permission IDs → NEW (real) permission IDs
const PERMISSION_MIGRATION_MAP: Record<string, string[]> = {
  // Old → New mappings
  'dashboard:view': [],  // No equivalent needed — dashboard has no permission check
  'services:view_history': ['services:view'],
  'services:create': ['services:create'],
  'services:edit': ['services:edit'],
  'inventory:manage': ['inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete'],
  'inventory:view_public_info': ['inventory:view'],
  'pos:create_sale': ['pos:create_sale'],
  'pos:view_sales': ['pos:view_sales'],
  'fleet:manage': ['fleet:view', 'fleet:create', 'fleet:edit'],
  'rentals:view': ['fleet:view'],
  'rentals:manage': ['fleet:manage_rentals'],
  'finances:view_report': ['finances:view'],
  'vehicles:manage': ['fleet:view', 'fleet:create', 'fleet:edit'],
  'personnel:manage': ['admin:manage_users_roles'],
  'billing:manage': ['billing:manage'],
  'messaging:manage': [],  // No equivalent
  'audits:view': ['admin:view_audit'],
  'ticket_config:manage': ['admin:settings'],
  'workshop:manage': ['admin:settings'],
};

// All valid permission IDs from permissions.ts
const VALID_PERMISSIONS = new Set([
  'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete', 'inventory:view_costs', 'inventory:manage_categories',
  'pos:view_sales', 'pos:create_sale', 'pos:delete_sale',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'purchases:view', 'purchases:create', 'purchases:delete', 'suppliers:manage',
  'fleet:view', 'fleet:create', 'fleet:edit', 'fleet:delete', 'fleet:manage_drivers', 'fleet:manage_rentals', 'fleet:delete_rentals',
  'finances:view', 'finances:manage_manual_entries', 'finances:delete_entries', 'billing:manage',
  'admin:manage_users_roles', 'admin:view_audit', 'admin:settings',
]);

async function migrateRoles() {
  console.log('🔍 Reading appRoles from Firestore...\n');
  const snapshot = await db.collection('appRoles').get();
  
  if (snapshot.empty) {
    console.log('⚠️  No roles found in Firestore. Nothing to migrate.');
    return;
  }

  let updated = 0;
  for (const roleDoc of snapshot.docs) {
    const role = roleDoc.data();
    const roleName = role.name || roleDoc.id;
    const oldPermissions: string[] = role.permissions || [];
    
    console.log(`\n📋 Role: "${roleName}" (${roleDoc.id})`);
    console.log(`   Old permissions (${oldPermissions.length}): ${oldPermissions.join(', ')}`);

    // Skip Superadministrador — it gets ALL permissions dynamically
    if (roleName === 'Superadministrador') {
      console.log('   ⏭️  Skipping — Superadministrador gets all permissions automatically.');
      continue;
    }

    // Migrate permissions
    const newPermissions = new Set<string>();
    const unknownPerms: string[] = [];
    
    for (const perm of oldPermissions) {
      if (VALID_PERMISSIONS.has(perm)) {
        // Already a valid permission — keep it
        newPermissions.add(perm);
      } else if (PERMISSION_MIGRATION_MAP[perm]) {
        // Old permission — map to new ones
        for (const newPerm of PERMISSION_MIGRATION_MAP[perm]) {
          newPermissions.add(newPerm);
        }
        console.log(`   🔄 Migrated: ${perm} → ${PERMISSION_MIGRATION_MAP[perm].join(', ') || '(removed)'}`);
      } else {
        unknownPerms.push(perm);
      }
    }

    if (unknownPerms.length > 0) {
      console.log(`   ⚠️  Unknown permissions (will be removed): ${unknownPerms.join(', ')}`);
    }

    const newPermsArray = Array.from(newPermissions).sort();
    
    // Check if anything changed
    const oldSorted = [...oldPermissions].sort();
    if (JSON.stringify(oldSorted) === JSON.stringify(newPermsArray)) {
      console.log('   ✅ No changes needed.');
      continue;
    }

    console.log(`   ✨ New permissions (${newPermsArray.length}): ${newPermsArray.join(', ')}`);
    
    // Update Firestore
    await roleDoc.ref.update({ permissions: newPermsArray });
    console.log('   💾 Updated in Firestore!');
    updated++;
  }

  console.log(`\n\n🎉 Migration complete! ${updated} role(s) updated.`);
}

migrateRoles().catch(console.error);
