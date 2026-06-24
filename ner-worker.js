// NER Worker — runs regex/dictionary engine off the main thread
importScripts('dictionaries.js?v=21.0', 'recognizers.js?v=21.0', 'ner-engine.js?v=21.0');

self.onmessage = (e) => {
    const { type, text, enabledEntities, threshold, requestId } = e.data;
    if (type === 'analyze') {
        try {
            const enabled = new Set(enabledEntities);
            const findings = analyzeText(text, enabled, threshold);
            self.postMessage({ type: 'result', requestId, findings });
        } catch (err) {
            self.postMessage({ type: 'error', requestId, message: err.message });
        }
    }
};

self.postMessage({ type: 'ready' });
