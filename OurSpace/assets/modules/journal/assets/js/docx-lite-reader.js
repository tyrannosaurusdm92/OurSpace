/*
  OurSpace DOCX Lite Reader
  Purpose: read text from .docx uploads in-browser without shipping heavy third-party code.
  Notes: DOCX files are ZIP containers. This reader extracts word/document.xml and converts paragraphs to plain text.
*/
(function () {
  'use strict';

  const textDecoder = new TextDecoder('utf-8');

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  function decodeName(bytes) {
    return textDecoder.decode(bytes);
  }

  function findEndOfCentralDirectory(view) {
    const min = Math.max(0, view.byteLength - 0xffff - 22);
    for (let i = view.byteLength - 22; i >= min; i -= 1) {
      if (u32(view, i) === 0x06054b50) return i;
    }
    throw new Error('DOCX ZIP directory was not found.');
  }

  function listZipEntries(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const eocd = findEndOfCentralDirectory(view);
    const entryCount = u16(view, eocd + 10);
    const centralDirectoryOffset = u32(view, eocd + 16);
    const entries = [];
    let ptr = centralDirectoryOffset;

    for (let i = 0; i < entryCount; i += 1) {
      if (u32(view, ptr) !== 0x02014b50) break;
      const method = u16(view, ptr + 10);
      const compressedSize = u32(view, ptr + 20);
      const uncompressedSize = u32(view, ptr + 24);
      const nameLength = u16(view, ptr + 28);
      const extraLength = u16(view, ptr + 30);
      const commentLength = u16(view, ptr + 32);
      const localHeaderOffset = u32(view, ptr + 42);
      const nameBytes = new Uint8Array(arrayBuffer, ptr + 46, nameLength);
      const name = decodeName(nameBytes);
      entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
      ptr += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress DOCX ZIP entries. TXT upload still works.');
    }
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (rawError) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (_wrappedError) {
        throw rawError;
      }
    }
  }

  async function readZipEntry(arrayBuffer, entry) {
    const view = new DataView(arrayBuffer);
    const local = entry.localHeaderOffset;
    if (u32(view, local) !== 0x04034b50) throw new Error('DOCX local file header was invalid.');
    const nameLength = u16(view, local + 26);
    const extraLength = u16(view, local + 28);
    const dataStart = local + 30 + nameLength + extraLength;
    const compressed = new Uint8Array(arrayBuffer, dataStart, entry.compressedSize);

    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRaw(compressed);
    throw new Error(`Unsupported DOCX compression method: ${entry.method}`);
  }

  function textFromXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) throw new Error('DOCX XML could not be parsed.');

    const paragraphs = [];
    const walk = (node, chunks) => {
      Array.from(node.childNodes).forEach((child) => {
        const localName = child.localName || child.nodeName;
        if (child.nodeType === Node.TEXT_NODE) {
          chunks.push(child.nodeValue || '');
        } else if (localName === 't') {
          chunks.push(child.textContent || '');
        } else if (localName === 'tab') {
          chunks.push('\t');
        } else if (localName === 'br' || localName === 'cr') {
          chunks.push('\n');
        } else {
          walk(child, chunks);
        }
      });
    };

    Array.from(doc.getElementsByTagName('*')).forEach((node) => {
      if ((node.localName || node.nodeName) === 'p') {
        const chunks = [];
        walk(node, chunks);
        const paragraph = chunks.join('').replace(/\u00a0/g, ' ').trimEnd();
        if (paragraph.trim()) paragraphs.push(paragraph);
      }
    });

    return paragraphs.join('\n\n').trim();
  }

  async function extractText(fileOrArrayBuffer) {
    const arrayBuffer = fileOrArrayBuffer instanceof ArrayBuffer
      ? fileOrArrayBuffer
      : await fileOrArrayBuffer.arrayBuffer();
    const entries = listZipEntries(arrayBuffer);
    const documentEntry = entries.find((entry) => entry.name === 'word/document.xml');
    if (!documentEntry) throw new Error('DOCX document body was not found.');
    const xmlBytes = await readZipEntry(arrayBuffer, documentEntry);
    return textFromXml(textDecoder.decode(xmlBytes));
  }

  window.OurSpaceDocxLite = { extractText };
}());
