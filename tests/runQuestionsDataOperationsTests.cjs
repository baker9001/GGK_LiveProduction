'use strict';

const Module = require('module');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');
const assert = require('assert/strict');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@/lib/supabase') {
    return path.resolve(__dirname, 'mocks/supabase.ts');
  }
  if (request === '@/components/shared/Toast') {
    return path.resolve(__dirname, 'mocks/toast.ts');
  }
  if (request.startsWith('@/')) {
    const relativePath = request.replace(/^@\//, 'src/');
    return path.resolve(process.cwd(), relativePath);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const originalTsExtension = Module._extensions['.ts'];
Module._extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const {
  insertSubQuestion,
  generateAttachmentKeyForImport,
} = require('../src/lib/data-operations/questionsDataOperations.ts');

function createSupabaseMock(subQuestionIds, attachmentCalls) {
  let insertIndex = 0;

  return {
    from(table) {
      if (table === 'sub_questions') {
        const builder = {};
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.is = () => builder;
        builder.maybeSingle = async () => ({ data: null, error: null });
        builder.insert = () => ({
          select: () => ({
            single: async () => ({
              data: { id: subQuestionIds[Math.min(insertIndex++, subQuestionIds.length - 1)] },
              error: null,
            }),
          }),
        });
        return builder;
      }

      if (table === 'questions_attachments') {
        return {
          insert: async (records) => {
            attachmentCalls.push(records);
            return { error: null };
          },
        };
      }

      return {
        insert: async () => ({ error: null }),
      };
    },
    storageFrom: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  };
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    return false;
  }
}

async function main() {
  const results = [];

  results.push(await runTest('uses UI attachment keys for part attachments', async () => {
    const attachmentCalls = [];
    global.__supabaseMock = createSupabaseMock(['sub-part'], attachmentCalls);

    const importQuestionId = 'legacy-question';
    const partIndex = 0;
    const attachmentKey = generateAttachmentKeyForImport(importQuestionId, partIndex);
    const uploadedAttachments = {
      [attachmentKey]: [
        {
          file_url: 'https://example.com/part.png',
          file_name: 'part.png',
          file_type: 'image/png',
          file_size: 123,
        },
      ],
    };

    await insertSubQuestion(
      'db-question',
      {
        part: 'a',
        order_index: partIndex,
        type: 'descriptive',
        question_description: 'Part description',
        marks: 1,
      },
      null,
      1,
      uploadedAttachments,
      {},
      'part',
      importQuestionId,
      partIndex,
    );

    assert.equal(attachmentCalls.length, 1);
    assert.equal(attachmentCalls[0][0].sub_question_id, 'sub-part');
    assert.equal(attachmentCalls[0][0].file_url, 'https://example.com/part.png');
  }));

  results.push(await runTest('propagates part and subpart indexes when inserting attachments', async () => {
    const attachmentCalls = [];
    global.__supabaseMock = createSupabaseMock(['part-sub', 'subpart-sub'], attachmentCalls);

    const importQuestionId = 'legacy-question';
    const partIndex = 1;
    const subpartIndex = 0;

    const uploadedAttachments = {
      [generateAttachmentKeyForImport(importQuestionId, partIndex)]: [
        {
          file_url: 'https://example.com/part.png',
          file_name: 'part.png',
          file_type: 'image/png',
          file_size: 100,
        },
      ],
      [generateAttachmentKeyForImport(importQuestionId, partIndex, subpartIndex)]: [
        {
          file_url: 'https://example.com/subpart.png',
          file_name: 'subpart.png',
          file_type: 'image/png',
          file_size: 50,
        },
      ],
    };

    await insertSubQuestion(
      'db-question',
      {
        part: 'b',
        order_index: partIndex,
        type: 'descriptive',
        question_description: 'Part description',
        marks: 2,
        subparts: [
          {
            subpart: 'i',
            order_index: subpartIndex,
            type: 'descriptive',
            question_description: 'Subpart description',
            marks: 1,
          },
        ],
      },
      null,
      1,
      uploadedAttachments,
      {},
      'part',
      importQuestionId,
      partIndex,
    );

    assert.equal(attachmentCalls.length, 2);
    assert.equal(attachmentCalls[0][0].sub_question_id, 'part-sub');
    assert.equal(attachmentCalls[0][0].file_url, 'https://example.com/part.png');
    assert.equal(attachmentCalls[1][0].sub_question_id, 'subpart-sub');
    assert.equal(attachmentCalls[1][0].file_url, 'https://example.com/subpart.png');
  }));

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  if (passed !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
