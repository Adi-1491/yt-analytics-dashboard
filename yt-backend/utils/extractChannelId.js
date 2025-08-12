// Quick check: is this already a real channelId? (UC... and length ~24)
function looksLikeChannelId(s) {
    return typeof s === 'string' && /^UC[a-zA-Z0-9_-]{22}$/.test(s);
  }
  
  function extractChannelId(input) {
    // If user pasted a raw id like "UC_x5XG1OV2P6uZZ5FSM9Ttw"
    if (looksLikeChannelId(input)) {
      return { type: 'id', value: input };
    }
  
    // Try to parse as URL
    try {
      const u = new URL(input);
      const p = u.pathname; // e.g. "/channel/UCxxx", "/user/SomeName", "/@handle"
  
      // /channel/UCxxxxx...
      if (p.startsWith('/channel/')) {
        const id = p.split('/channel/')[1].split('/')[0];
        return { type: 'id', value: id };
      }
  
      // /user/SomeLegacyUsername
      if (p.startsWith('/user/')) {
        const user = p.split('/user/')[1].split('/')[0];
        return { type: 'user', value: user };
      }
  
      // /@handle
      if (p.startsWith('/@')) {
        const handle = p.slice(2).split('/')[0]; // remove "/@" then take first segment
        return { type: 'handle', value: handle };
      }
  
      // Sometimes people paste a channel home like "/c/SomeCustom"
      // This is legacy custom URL; treat like a search/handle fallback
      if (p.startsWith('/c/')) {
        const custom = p.split('/c/')[1].split('/')[0];
        return { type: 'handle', value: custom };
      }
  
      // If nothing matched but there is a "channelId" query param
      const qId = u.searchParams.get('channelId');
      if (looksLikeChannelId(qId)) {
        return { type: 'id', value: qId };
      }
  
      // Give up politely
      return null;
    } catch {
      // Not a URL. If it still looks like an id, we already handled above; so:
      return null;
    }
  }
  
  module.exports = { extractChannelId, looksLikeChannelId };
  