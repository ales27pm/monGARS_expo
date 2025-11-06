#!/usr/bin/env node

/**
 * Post-install script to fix expo-modules-core iOS 18 compatibility
 * This fixes the onGeometryChange API availability check
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  process.cwd(),
  'node_modules',
  'expo-modules-core',
  'ios',
  'Core',
  'Views',
  'SwiftUI',
  'AutoSizingStack.swift'
);

console.log('🔧 Fixing expo-modules-core for iOS 18 compatibility...');

if (!fs.existsSync(filePath)) {
  console.warn('⚠️  AutoSizingStack.swift not found. Skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('iOS 18.0')) {
  console.log('✅ expo-modules-core already patched');
  process.exit(0);
}

// Apply the fix
const oldCheck = 'if #available(iOS 16.0, tvOS 16.0, macOS 13.0, *)';
const newCheck = 'if #available(iOS 18.0, tvOS 18.0, macOS 15.0, *)';

const oldWarning = 'log.warn("AutoSizingStack is not supported on iOS/tvOS < 16.0")';
const newWarning = 'log.warn("AutoSizingStack requires iOS 18.0+. Using fallback behavior without auto-sizing.")';

const oldComment = '// TODO: throw a warning';
const newComment = '// Fallback for iOS < 18.0 - onGeometryChange requires iOS 18+';

content = content.replace(oldCheck, newCheck);
content = content.replace(oldWarning, newWarning);
content = content.replace(oldComment, newComment);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ expo-modules-core patched successfully');
console.log('   - Updated iOS availability check: 16.0 → 18.0');
console.log('   - onGeometryChange now properly gated for iOS 18+');
