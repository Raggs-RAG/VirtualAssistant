/**
 * CultureLM for Google Docs — sidebar add-on.
 * Reads the open document, sends it to the CultureLM API, and returns
 * the episode script (and audio, when small enough to transfer).
 */

var API_BASE = 'https://culturelm.vercel.app';

function onOpen() {
  DocumentApp.getUi()
    .createMenu('CultureLM')
    .addItem('Run the Breakdown', 'showSidebar')
    .addToUi();
}

function onInstall() {
  onOpen();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('CultureLM');
  DocumentApp.getUi().showSidebar(html);
}

/** Returns the full text of the open document. */
function getDocText() {
  return DocumentApp.getActiveDocument().getBody().getText();
}

/** Generates the episode script for the open doc. */
function generateScript(archetypeId, mode) {
  var text = getDocText();
  if (!text || !text.trim()) {
    throw new Error('This document is empty.');
  }
  var res = UrlFetchApp.fetch(API_BASE + '/api/generate', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      archetypeId: archetypeId,
      mode: mode,
      sourceText: text.slice(0, 120000),
    }),
    muteHttpExceptions: true,
  });
  var data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    throw new Error(data.error || 'Generation failed.');
  }
  return data; // { script, show }
}

/**
 * Generates audio for a script. Returns a data URL when the payload is
 * small enough for the sidebar bridge; otherwise returns { tooBig: true }
 * and the sidebar links to the web app instead.
 */
function generateAudio(script, archetypeId, mode) {
  var res = UrlFetchApp.fetch(API_BASE + '/api/audio', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      script: script,
      archetypeId: archetypeId,
      mode: mode,
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    var err;
    try {
      err = JSON.parse(res.getContentText()).error;
    } catch (e) {
      err = 'Audio generation failed.';
    }
    throw new Error(err);
  }
  var bytes = res.getContent();
  // google.script.run payloads cap out well below long episodes.
  if (bytes.length > 8 * 1024 * 1024) {
    return { tooBig: true, webUrl: API_BASE };
  }
  return {
    dataUrl: 'data:audio/wav;base64,' + Utilities.base64Encode(bytes),
  };
}
