const State = (() =>{
    const KEYS = {
        SESSION: "taskapp_session",
        FILTER: "taskapp_filter",
        SORT: "taskapp_sort",
        SEARCH: "taskapp_search",
        DRAFTS: "taskapp_drafts",
        NEW_CARD_DRAFT: "taskapp_new_card",
        EDITING: "taskapp_editing",
    };


    /**
     * 
     * @param {string} key 
     * @param {*} fallback 
     * @returns {*}
     */

    function get(key, fallback = null){
        try{
            const raw = localStorage.getItem(key);
            if(raw === null) return fallback;
            return JSON.parse(raw);

        }catch{
            return fallback;
        }
    }

    /**
     * @param {string} key
     * @param {*} value
     */

    function set(key, value){

        try{
            localStorage.setItem(key, JSON.stringify(value));
        }catch{
            // fail silentely without crashing the app
        }
    }

    /**
     * @param {string} key
     * 
     */
    function remove(key){
        localStorage.removeItem(key);
    }

    function saveSession(username, userId){
        set(KEYS.SESSION, {username, user_id: userId});
    }

    function getSession(){
        return get(KEYS.SESSION, null);
    }

    function clearSession(){
        remove(KEYS.SESSION);
    }

    function saveFilter(filter){
        set(KEYS.FILTER, filter);
    }

    function getfilter(){
        return get(KEYS.FILTER, "all")
    }


    function saveSort(sort){
        set(KEYS.SORT, sort);
    }

    function getSort() {
        return get(KEYS.SORT, "newest")
    }

    function saveSearch(query){
        set(KEYS.SEARCH, query);
    }

    function getSearch(){
        return get(KEYS.SEARCH, "");
    }

    function saveDraft(cardId, text){
        const drafts = get(KEYS.DRAFTS, {});
        if(text) {
            drafts[cardId] = text;
        } else {
            delete drafts[cardId];
        }
        set(KEYS.DRAFTS, drafts);
    }

    function getDraft(cardId) {
        const drafts = get(KEYS.DRAFTS, {});
        return drafts[cardId] || "";
    }

    function clearDraft(cardId) {
        saveDraft(cardId, "");
    }


    function saveNewCardDraft(text){
        set(KEYS.NEW_CARD_DRAFT, text);
    }

    function getNewCardDraft(){
        return get(KEYS.NEW_CARD_DRAFT, "");
    }

    function clearNewCardDraft() {
        remove(KEYS.NEW_CARD_DRAFT);
    }

    /**
     * @param {object} state
     */

    function saveEditing(state) {
        set(KEYS.EDITING, state);
    }

    function getEditing(){
        set(KEYS.EDITING, null)
    }

    function clearEditing(){
        remove(KEYS.EDITING);
    }

    function clearAll() {
        Object.values(KEYS).forEach((key) => remove(key));
    }


    return {
        saveSession,
        getSession,
        clearSession,
        saveFilter,
        getfilter,
        saveSort,
        getSort,
        saveSearch,
        getSearch,
        saveDraft,
        getDraft,
        clearDraft,
        saveNewCardDraft,
        getNewCardDraft,
        clearNewCardDraft,
        saveEditing,
        getEditing,
        clearEditing,
        clearAll,
    };
})();