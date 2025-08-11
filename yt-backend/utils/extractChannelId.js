//Quick check : is this already a chanel id
function looksLikeChannelId(s) {
    return typeof s === 'string' && /^UC[a-zA-Z0-9_-]{22}$/.test(s);
}

function extractChannelId(input) {
    //if user pasted a raw chanel id
    if(looksLikeChannelId(input)) {
        return { type: 'id' , value: input };
    }
}

//try to parse as url
const u = new URL(input);
const p = u.pathname; //e.g/ "/channel/UCxx", "/user/SomeName", "/@handle"

// /channel/UCxx
if(p.startsWith('/channel/')) {
    const id = p.split('/channel')[1].split('/')[0];
    return { type: 'id', value:id};
}

// /user/somename
if(p.startsWith('/user/')) {
    
}