#!/usr/bin/env node
/**
 * Idempotent migration script to migrate legacy local media assets to Cloudflare R2.
 *
 * Usage:
 *   node scripts/migrateMediaToR2.js [--dry-run] [--delete-local]
 *
 * Flags:
 *   --dry-run        Inspect and report assets that would be migrated without making changes
 *   --delete-local   Delete local file from disk after successful upload to R2
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const MediaAsset = require('../src/models/MediaAsset');
const { getStorageConfig, validateR2Config } = require('../src/services/storage/storageConfig');
const R2StorageProvider = require('../src/services/storage/r2StorageProvider');
const { UPLOADS_ROOT } = require('../src/controllers/media/mediaController');

async function runMigration(options = {}) {
  const isDryRun = options.dryRun !== undefined ? options.dryRun : process.argv.includes('--dry-run');
  const deleteLocal = options.deleteLocal !== undefined ? options.deleteLocal : process.argv.includes('--delete-local');

  console.log(`=== Market Aura 4U: Media Migration to Cloudflare R2 ===`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (read-only, no changes will be made)' : 'LIVE EXECUTION'}`);
  console.log(`Delete local files after upload: ${deleteLocal ? 'YES' : 'NO'}`);

  const config = getStorageConfig();
  validateR2Config(config);

  const r2Provider = options.r2Provider || new R2StorageProvider(config.r2);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/market_aura';
  if (mongoose.connection.readyState !== 1 && !options.skipDbConnect) {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB.`);
  }

  // Find media assets that are local uploads and have not yet been migrated to R2
  const candidateFilter = {
    sourceType: 'upload',
    storageKey: { $ne: null },
    $or: [
      { storageProvider: { $ne: 'r2' } },
      { storageProvider: null },
      { storageProvider: { $exists: false } },
    ],
  };

  const assets = await MediaAsset.find(candidateFilter);
  console.log(`Found ${assets.length} candidate media asset(s) for migration.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of assets) {
    const assetId = asset._id ? asset._id.toString() : (asset.id || 'unknown');
    const localKey = asset.storageKey;
    const localPath = path.resolve(UPLOADS_ROOT, localKey);

    // Check if asset already has an R2 key or URL
    if (asset.storageProvider === 'r2' || (asset.url && asset.url.startsWith(config.r2.publicBaseUrl))) {
      console.log(`[SKIP] Asset ${assetId} ("${asset.title}") already migrated.`);
      skipped += 1;
      continue;
    }

    if (!fs.existsSync(localPath)) {
      console.warn(`[WARN] Local file missing for asset ${assetId}: ${localPath}`);
      skipped += 1;
      continue;
    }

    const stat = fs.statSync(localPath);
    const ext = path.extname(localKey).replace(/^\./, '') || 'jpg';
    const r2Key = r2Provider.buildStorageKey({ userId: asset.userId, ext });
    const targetUrl = r2Provider.getPublicUrl(r2Key);

    console.log(`[TARGET] Asset ${assetId}: "${asset.title}"`);
    console.log(`   Source: ${localPath} (${stat.size} bytes)`);
    console.log(`   Destination Key: ${r2Key}`);
    console.log(`   Destination URL: ${targetUrl}`);

    if (isDryRun) {
      migrated += 1;
      continue;
    }

    try {
      const buffer = fs.readFileSync(localPath);
      await r2Provider.upload({
        buffer,
        key: r2Key,
        contentType: asset.mimeType || 'image/jpeg',
        metadata: {
          userid: String(asset.userId),
          assetid: assetId,
          migratedat: new Date().toISOString(),
        },
      });

      asset.storageKey = r2Key;
      asset.url = targetUrl;
      asset.storageProvider = 'r2';
      await asset.save();

      console.log(`   [SUCCESS] Uploaded to R2 and updated MediaAsset.`);

      if (deleteLocal) {
        fs.unlinkSync(localPath);
        console.log(`   [CLEANUP] Deleted local file: ${localPath}`);
      }

      migrated += 1;
    } catch (err) {
      console.error(`   [ERROR] Failed to migrate asset ${assetId}:`, err.message);
      failed += 1;
    }
  }

  const summary = {
    isDryRun,
    totalCandidates: assets.length,
    migrated,
    skipped,
    failed,
  };

  console.log(`\n=== Migration Summary ===`);
  console.log(`Mode:       ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Candidates: ${assets.length}`);
  console.log(`Migrated:   ${migrated}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);

  return summary;
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration aborted with error:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
