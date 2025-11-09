#!/usr/bin/env node

/**
 * Design System Adoption Analysis Script
 * Scans all page.tsx files and checks for design system component usage
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PROJECT_ROOT = '/tmp/cc-agent/54326970/project';

// Design system components to check for
const DESIGN_SYSTEM_COMPONENTS = {
  // Core components
  'PageHeader': { import: '@/components/shared/PageHeader', critical: true },
  'Card': { import: '@/components/shared/Card', critical: true },
  'Button': { import: '@/components/shared/Button', critical: true },
  'FilterPanel': { import: '@/components/shared/FilterPanel', critical: false },
  'Badge': { import: '@/components/shared/Badge', critical: false },
  'Stepper': { import: '@/components/shared/Stepper', critical: false },

  // Design tokens
  'ggk-primary': { type: 'token', critical: true },
  'ggk-neutral': { type: 'token', critical: true },
  'shadow-ggk': { type: 'token', critical: false },
  'rounded-ggk': { type: 'token', critical: false },
};

// Module categorization
const MODULE_PATTERNS = {
  'System Admin': /system-admin/,
  'Entity Module': /entity-module/,
  'Teachers Module': /teachers-module/,
  'Student Module': /student-module/,
  'Landing Pages': /landing/,
  'Auth Pages': /signin|forgot-password|reset-password|auth/,
};

function getAllPageFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      getAllPageFiles(filePath, fileList);
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(PROJECT_ROOT, filePath);

  const results = {
    path: relativePath,
    module: getModule(relativePath),
    hasPageHeader: content.includes('PageHeader'),
    hasCard: content.includes('Card'),
    hasButton: content.includes('Button') || content.includes('<Button'),
    hasFilterPanel: content.includes('FilterPanel'),
    hasBadge: content.includes('Badge'),
    hasStepper: content.includes('Stepper'),
    usesTokens: /ggk-(?:primary|neutral|success|warning|danger)/.test(content),
    usesShadowTokens: /shadow-ggk/.test(content),
    usesRadiusTokens: /rounded-ggk/.test(content),
    linesOfCode: content.split('\n').length,
    hasModernLayout: content.includes('min-h-screen') && (content.includes('bg-ggk-neutral') || content.includes('bg-neutral')),
  };

  // Calculate adoption score (0-100)
  let score = 0;
  if (results.hasPageHeader) score += 25;
  if (results.hasCard) score += 20;
  if (results.hasButton) score += 15;
  if (results.usesTokens) score += 20;
  if (results.hasModernLayout) score += 10;
  if (results.hasFilterPanel) score += 5;
  if (results.hasBadge) score += 5;

  results.adoptionScore = Math.min(score, 100);
  results.adoptionLevel = getAdoptionLevel(results.adoptionScore);

  return results;
}

function getModule(path) {
  for (const [name, pattern] of Object.entries(MODULE_PATTERNS)) {
    if (pattern.test(path)) return name;
  }
  return 'Other';
}

function getAdoptionLevel(score) {
  if (score >= 80) return 'Complete';
  if (score >= 50) return 'Partial';
  if (score >= 20) return 'Minimal';
  return 'None';
}

function generateReport(analyses) {
  const byModule = {};
  const byAdoption = { Complete: [], Partial: [], Minimal: [], None: [] };

  analyses.forEach(analysis => {
    // Group by module
    if (!byModule[analysis.module]) {
      byModule[analysis.module] = [];
    }
    byModule[analysis.module].push(analysis);

    // Group by adoption
    byAdoption[analysis.adoptionLevel].push(analysis);
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           DESIGN SYSTEM ADOPTION ANALYSIS REPORT                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Overall statistics
  const totalPages = analyses.length;
  const avgScore = (analyses.reduce((sum, a) => sum + a.adoptionScore, 0) / totalPages).toFixed(1);

  console.log('📊 OVERALL STATISTICS');
  console.log('═'.repeat(70));
  console.log(`Total Pages Analyzed: ${totalPages}`);
  console.log(`Average Adoption Score: ${avgScore}%`);
  console.log(`Complete Adoption: ${byAdoption.Complete.length} (${(byAdoption.Complete.length/totalPages*100).toFixed(1)}%)`);
  console.log(`Partial Adoption: ${byAdoption.Partial.length} (${(byAdoption.Partial.length/totalPages*100).toFixed(1)}%)`);
  console.log(`Minimal Adoption: ${byAdoption.Minimal.length} (${(byAdoption.Minimal.length/totalPages*100).toFixed(1)}%)`);
  console.log(`No Adoption: ${byAdoption.None.length} (${(byAdoption.None.length/totalPages*100).toFixed(1)}%)`);
  console.log();

  // By module breakdown
  console.log('📁 BY MODULE BREAKDOWN');
  console.log('═'.repeat(70));
  Object.entries(byModule).sort((a, b) => b[1].length - a[1].length).forEach(([module, pages]) => {
    const moduleAvg = (pages.reduce((sum, p) => sum + p.adoptionScore, 0) / pages.length).toFixed(1);
    console.log(`\n${module} (${pages.length} pages, ${moduleAvg}% avg score)`);
    console.log('─'.repeat(70));

    pages.sort((a, b) => b.adoptionScore - a.adoptionScore).forEach(page => {
      const indicator = page.adoptionScore >= 80 ? '✅' : page.adoptionScore >= 50 ? '🔶' : '❌';
      const shortPath = page.path.replace('src/app/', '');
      console.log(`  ${indicator} [${page.adoptionScore}%] ${shortPath}`);
    });
  });

  // Pages needing migration (< 80% adoption)
  const needsMigration = analyses.filter(a => a.adoptionScore < 80).sort((a, b) => a.adoptionScore - b.adoptionScore);

  if (needsMigration.length > 0) {
    console.log('\n\n🎯 MIGRATION PRIORITY LIST');
    console.log('═'.repeat(70));
    console.log(`${needsMigration.length} pages need design system migration\n`);

    const priority = {
      'High Priority (0-49%)': needsMigration.filter(p => p.adoptionScore < 50),
      'Medium Priority (50-79%)': needsMigration.filter(p => p.adoptionScore >= 50 && p.adoptionScore < 80),
    };

    Object.entries(priority).forEach(([level, pages]) => {
      if (pages.length > 0) {
        console.log(`\n${level} - ${pages.length} pages`);
        console.log('─'.repeat(70));
        pages.forEach((page, idx) => {
          console.log(`${idx + 1}. [${page.adoptionScore}%] ${page.path.replace('src/app/', '')}`);
          console.log(`   Missing: ${getMissingComponents(page).join(', ')}`);
        });
      }
    });
  }

  // Component usage statistics
  console.log('\n\n📦 COMPONENT USAGE STATISTICS');
  console.log('═'.repeat(70));
  const componentStats = {
    PageHeader: analyses.filter(a => a.hasPageHeader).length,
    Card: analyses.filter(a => a.hasCard).length,
    Button: analyses.filter(a => a.hasButton).length,
    FilterPanel: analyses.filter(a => a.hasFilterPanel).length,
    Badge: analyses.filter(a => a.hasBadge).length,
    'Design Tokens': analyses.filter(a => a.usesTokens).length,
    'Modern Layout': analyses.filter(a => a.hasModernLayout).length,
  };

  Object.entries(componentStats).forEach(([component, count]) => {
    const percentage = (count / totalPages * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / totalPages * 50));
    console.log(`${component.padEnd(20)} ${bar} ${count}/${totalPages} (${percentage}%)`);
  });

  console.log('\n' + '═'.repeat(70));
  console.log('Analysis complete! Use this data to prioritize migration efforts.\n');

  return { byModule, byAdoption, needsMigration };
}

function getMissingComponents(analysis) {
  const missing = [];
  if (!analysis.hasPageHeader) missing.push('PageHeader');
  if (!analysis.hasCard) missing.push('Card');
  if (!analysis.usesTokens) missing.push('Design Tokens');
  if (!analysis.hasModernLayout) missing.push('Modern Layout');
  return missing;
}

// Main execution
try {
  const srcDir = join(PROJECT_ROOT, 'src', 'app');
  const pageFiles = getAllPageFiles(srcDir);

  console.log(`Found ${pageFiles.length} page files to analyze...\n`);

  const analyses = pageFiles.map(analyzeFile);
  const report = generateReport(analyses);

  // Export detailed JSON for programmatic use
  const outputPath = join(PROJECT_ROOT, 'design_system_adoption_report.json');
  import('fs').then(fs => {
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: analyses.length,
        averageScore: (analyses.reduce((sum, a) => sum + a.adoptionScore, 0) / analyses.length).toFixed(1),
        complete: report.byAdoption.Complete.length,
        partial: report.byAdoption.Partial.length,
        minimal: report.byAdoption.Minimal.length,
        none: report.byAdoption.None.length,
      },
      pages: analyses,
      byModule: report.byModule,
    }, null, 2));

    console.log(`\n📄 Detailed report exported to: design_system_adoption_report.json\n`);
  });

} catch (error) {
  console.error('Error during analysis:', error);
  process.exit(1);
}
