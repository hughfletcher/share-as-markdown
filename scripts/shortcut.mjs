// Generates the Shortcut workflow as a plist. The action layout:
//
//   1. Run JavaScript on Web Page   (Shortcut Input = Safari web page)  -> Dictionary
//   2. Get Dictionary Value "error"
//   3. If error has any value: Show Alert, Stop This Shortcut
//   4. Get Dictionary Value "markdown"
//   5. Get Dictionary Value "filename"
//   6. Set Name of (markdown) to (filename)   -> a real .md file
//   7. Share (file)                           -> native Share Sheet
//
// Apple does not document this format. The keys below follow what Shortcuts
// itself exports; if an iOS release rejects them, build the shortcut by hand
// from docs/manual-setup.md.

import { createHash } from 'node:crypto';

const OBJ = '￼'; // placeholder Shortcuts uses for an inline variable

// Stable UUIDs so rebuilding does not churn the committed .shortcut file.
function stableUuid(name) {
  const hex = createHash('sha1').update(`web-to-markdown:${name}`).digest('hex').toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function outputRef(uuid, name) {
  return { OutputName: name, OutputUUID: uuid, Type: 'ActionOutput' };
}

function attachment(ref) {
  return { Value: ref, WFSerializationType: 'WFTextTokenAttachment' };
}

function tokenString(before, ref, after = '') {
  return {
    Value: {
      attachmentsByRange: { [`{${before.length}, 1}`]: ref },
      string: `${before}${OBJ}${after}`,
    },
    WFSerializationType: 'WFTextTokenString',
  };
}

function action(identifier, parameters) {
  return { WFWorkflowActionIdentifier: identifier, WFWorkflowActionParameters: parameters };
}

export function buildShortcut({ script }) {
  const ids = {
    js: stableUuid('js'),
    error: stableUuid('error'),
    markdown: stableUuid('markdown'),
    filename: stableUuid('filename'),
    named: stableUuid('named'),
    ifGroup: stableUuid('ifGroup'),
  };
  const jsOut = outputRef(ids.js, 'Result of JavaScript');
  const errorOut = outputRef(ids.error, 'Error');
  const markdownOut = outputRef(ids.markdown, 'Markdown');
  const filenameOut = outputRef(ids.filename, 'Filename');
  const namedOut = outputRef(ids.named, 'Renamed Item');
  const getValue = (id, key) =>
    action('is.workflow.actions.getvalueforkey', {
      UUID: id,
      WFDictionaryKey: key,
      WFGetDictionaryValueType: 'Value',
      WFInput: attachment(jsOut),
    });

  const actions = [
    action('is.workflow.actions.runjavascriptonwebpage', {
      UUID: ids.js,
      WFInput: attachment({ Type: 'ExtensionInput' }),
      WFJavaScript: script,
    }),
    getValue(ids.error, 'error'),
    action('is.workflow.actions.conditional', {
      GroupingIdentifier: ids.ifGroup,
      WFControlFlowMode: 0,
      WFCondition: 100, // "has any value"
      WFInput: { Type: 'Variable', Variable: attachment(errorOut) },
    }),
    action('is.workflow.actions.alert', {
      WFAlertActionTitle: 'Web to Markdown',
      WFAlertActionMessage: tokenString('Could not convert this page: ', errorOut),
      WFAlertActionCancelButtonShown: false,
    }),
    action('is.workflow.actions.exit', {}),
    action('is.workflow.actions.conditional', {
      GroupingIdentifier: ids.ifGroup,
      WFControlFlowMode: 2,
    }),
    getValue(ids.markdown, 'markdown'),
    getValue(ids.filename, 'filename'),
    action('is.workflow.actions.setitemname', {
      UUID: ids.named,
      WFInput: attachment(markdownOut),
      WFName: tokenString('', filenameOut),
      WFDontIncludeFileExtension: false,
    }),
    action('is.workflow.actions.share', {
      WFInput: attachment(namedOut),
    }),
  ];

  return {
    WFWorkflowClientVersion: '2302.0.4',
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: '900',
    WFWorkflowIcon: { WFWorkflowIconStartColor: 4282601983, WFWorkflowIconGlyphNumber: 59446 },
    WFWorkflowImportQuestions: [],
    WFWorkflowTypes: ['ActionExtension'],
    WFWorkflowInputContentItemClasses: ['WFSafariWebPageContentItem'],
    WFWorkflowOutputContentItemClasses: [],
    WFWorkflowHasShortcutInputVariables: true,
    WFQuickActionSurfaces: [],
    WFWorkflowActions: actions,
  };
}

// Minimal XML plist serializer (strings, integers, booleans, arrays, dicts).
export function toPlist(value) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ser = (v, indent) => {
    const pad = '\t'.repeat(indent);
    if (typeof v === 'string') return `${pad}<string>${esc(v)}</string>`;
    if (typeof v === 'boolean') return `${pad}<${v}/>`;
    if (typeof v === 'number') return `${pad}<integer>${v}</integer>`;
    if (Array.isArray(v)) {
      if (!v.length) return `${pad}<array/>`;
      return `${pad}<array>\n${v.map((x) => ser(x, indent + 1)).join('\n')}\n${pad}</array>`;
    }
    const keys = Object.keys(v);
    if (!keys.length) return `${pad}<dict/>`;
    const body = keys.map((k) => `${pad}\t<key>${esc(k)}</key>\n${ser(v[k], indent + 1)}`).join('\n');
    return `${pad}<dict>\n${body}\n${pad}</dict>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${ser(value, 0)}
</plist>
`;
}
