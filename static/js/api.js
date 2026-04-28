const API = (() => 
async function requtes(url, options = {}){
    try{
        const res = await fetch(url, {headers: {"Content-Type": "application/json"}, ...options });
        const data = await res.json();
        if(!res.ok) throw data.error || "An unexpected error occurred!";
        return data;
    }catch (err){
        if(typeof err === "string") throw err;
        throw "Network error. Please check your connection!"
    }

    return{
        login: (u, p) => requtes("/api/login", {method: "POST", body: JSON.stringify({username: u, password: p}) }),
        register: (u, p) => requtes("/api/register", {method: "POST", body: JSON.stringify({username: u,password: p}) }),
        getCards: (uid) => requtes(`/api/card?user_id=${uid}`),
        createCard: (uid, title) => requtes("/api/cards", {method: "POST", body: JSON.stringify({user_id: uid, title})}),
        updateCard: (uid, cid, title) => requtes(`/api/cards/${cid}`, { method: "PUT", body: JSON.stringify({user_id: uid, title})}),
        deleteCard: (uid, cid) => requtes(`/api/cards/${cid}`, {method: "DELETE", body: JSON.stringify({user_id: uid})}),
        deleteAllCards: (uid) => requtes("/api/cards/bulk-delete", {method: "POST", body: JSON.stringify({user_id: uid})}),
        addTask: (uid, cid, text) => requtes(`/api/cards/${cid}/tasks`, {method: "PUT", body:JSON.stringify({user_id: uid, text})}),
        updateTask: (uid, cid, idx, updates) => requtes(`/api/cards/${cid}/tasks/${idx}`, {methdd: "PUT", body: JSON.stringify({user_id: uid, ...updates})}),
        deleteTask: (uid, cid, idx) => requtes(`/api/cards/${cid}/tasks/${idx}`, { method: "DELETE", body: JSON.stringify({user_id: uid})}),
        bulkTaskAction: (uid, cid, action) => requtes(`/api/cards/${cid}/tasks/bulk`, { method: "POST", body: JSON.stringify({user_id: uid, action})}),

        getNotes: (uid) => requtes(`/api/notes?user_id=${uid}`),
        createNote: (uid, title, body) => requtes("/api/notes", {method: "POST", body: JSON.stringify({user_id: uid, title, body})}),
        updateNote: (id, uid, title, body) => requtes(`/api/notes/${id}`, {method: "PUT", body: JSON.stringify({user_id: uid, title, body})}),
        deleteNote: (id, uid) => requtes(`/api/notes/${id}`, {method: "DELETE", body: JSON.stringify({user_id: uid})}),
        searchNotes: (uid, q) => requtes(`/api/notes/search?user_id=${uid}&q=${encodeURIComponent(q)}`),
    };
})();