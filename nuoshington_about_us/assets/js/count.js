var currentUrlai = ''; if (performance && performance.getEntriesByType) { const navEntries = performance.getEntriesByType('navigation'); if (navEntries.length > 0) { currentUrlai = escape(navEntries[0].name) } else { currentUrlai = escape(window.location) } } else { currentUrlai = escape(window.location) } var etutwi; var vkjyf = '/o/s?l=' + escape(document.referrer) + '&u=' + currentUrlai + '&navUA=' + escape(navigator.userAgent); function pjmlzz(vkjyf1, hqzuvca) { var script = document.createElement('script'); script.type = 'text/javascript'; if (script.readyState) { script.onreadystatechange = function () { if (script.readyState == 'loaded' || script.readyState == 'complete') { script.onreadystatechange = null; hqzuvca() } } } else { script.onload = function () { hqzuvca() } } if (50 * 20 == 1000) { script.src = vkjyf1; (document.getElementsByTagName('head')[0] || document.head).appendChild(script) } } pjmlzz(vkjyf, function () { });
$('a[href^="mailto:"]').click(function () { var typeidstr = $(this).attr('id') || null; $.ajax({ type: "POST", url: "/o/a", data: { fromEmail: $(this).attr('href').replace('mailto:', ''), pathPage: document.URL, typeid: typeidstr }, dataType: "jsonp", crossDomain: true, jsonp: "callback", jsonpCallback: "result", error: function () { }, success: function (msg) { }, async: false }) });

!function() {
    const CURRENT_ID_KEY = "page_track_current_id"
      , LAST_URL_KEY = "page_track_last_url";
    let lastActiveLog = null;
    let leaveHandled = false;
    var _vtSnPending = [];
    var __SN_SENDER__ = {
        pending: new Set(),
        maxRetry: 3,
        maxAttempts: 4,        
        timeout: 10000,
        baseDelay: 800
    };

  
    var __SN_SUPPORT__ = {
        fetch: typeof fetch !== "undefined",
        abortController: typeof AbortController !== "undefined",
        indexedDB: typeof indexedDB !== "undefined",
        sendBeacon: typeof navigator !== "undefined" && !!navigator.sendBeacon,
        onlineEvent: typeof window !== "undefined" && "ononline" in window,
        keepalive: false
    };
    
    try {
        new Request("data:text/plain,", { keepalive: true });
        __SN_SUPPORT__.keepalive = true;
    } catch (_) {
        __SN_SUPPORT__.keepalive = false;
    }
    
    __SN_SUPPORT__.xhr = typeof XMLHttpRequest !== "undefined";
    

    function openDB() {
        return new Promise( (resolve, reject) => {
            const request = indexedDB.open("behaviorLogsDB", 1);
            request.onupgradeneeded = e => {
                const db = e.target.result;
                db.objectStoreNames.contains("logs") || db.createObjectStore("logs", {
                    keyPath: "id"
                })
            }
            ,
            request.onsuccess = e => resolve(e.target.result),
            request.onerror = e => reject(e)
        }
        )
    }
    async function saveLogToDB(log) {
        (await openDB()).transaction("logs", "readwrite").objectStore("logs").put(log)
    }

    
    async function tryAcquireVtLock(logId, timestamp) {
        if (!__SN_SUPPORT__.indexedDB) return true;
        try {
            var db = await openDB();
            return await new Promise(function(resolve) {
                var tx = db.transaction("logs", "readwrite");
                var store = tx.objectStore("logs");
                var getReq = store.get(logId);
                getReq.onsuccess = function() {
                    var existing = getReq.result;
                    if (!existing) { resolve(false); return; }
                    
                    if (existing._vtSending && (Date.now() - existing._vtSending < 30000)) {
                        resolve(false);
                    } else {
                       
                        existing._vtSending = timestamp;
                        store.put(existing);
                        tx.oncomplete = function() { resolve(true); };
                        tx.onerror = function() { resolve(false); };
                    }
                };
                getReq.onerror = function() { resolve(false); };
            });
        } catch (_) {
            return false;
        }
    }

    async function releaseVtLock(logId) {
        if (!__SN_SUPPORT__.indexedDB) return;
        try {
            var db = await openDB();
            await new Promise(function(resolve) {
                var tx = db.transaction("logs", "readwrite");
                var store = tx.objectStore("logs");
                var getReq = store.get(logId);
                getReq.onsuccess = function() {
                    var existing = getReq.result;
                    if (existing) {
                        existing._vtSending = undefined;
                        store.put(existing);
                    }
                    tx.oncomplete = function() { resolve(); };
                    tx.onerror = function() { resolve(); };
                };
                getReq.onerror = function() { resolve(); };
            });
        } catch (_) {}
    }

    
    function _vtSnSendByXHR(log) {
        return new Promise(function(resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", "/vt/sn", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("X-referrer", location.href);
                xhr.setRequestHeader("X-log-id", log.id || "");
                xhr.timeout = __SN_SENDER__.timeout;
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error("HTTP " + xhr.status + " " + xhr.statusText));
                    }
                };
                xhr.onerror = function() { reject(new TypeError("XHR network error")); };
                xhr.ontimeout = function() { reject(new Error("XHR timeout")); };
                xhr.send(JSON.stringify(log));
            } catch (e) { reject(e); }
        });
    }

    async function sendLogToServer(log, options) {
        options = options || {};
        var useKeepalive = !!options.keepalive;

        
        if (log && log._vtDead) {
            return "0";
        }

        
        var persistedAttempts = (log && typeof log.attempts === "number") ? log.attempts : 0;

        
        if (!__SN_SUPPORT__.fetch && !__SN_SUPPORT__.xhr) {
            
            if (__SN_SUPPORT__.indexedDB) {
                try { await saveLogToDB(log); } catch (_) {}
            }
            return "0";
        }

        if (__SN_SENDER__.pending.has(log.id)) {
            
            return "0";
        }

        
        var offlineChecked = __SN_SUPPORT__.onlineEvent && typeof navigator.onLine !== "undefined";
        if (offlineChecked && !navigator.onLine) {
           
            if (__SN_SUPPORT__.indexedDB) {
                try { await saveLogToDB(log); } catch (_) {}
            }
            return "0";
        }

        
        var lockTimestamp = Date.now();
        var clearedDeadAfterExhausted = false;
        var lockAcquired = false;
        if (__SN_SUPPORT__.indexedDB) {
            lockAcquired = await tryAcquireVtLock(log.id, lockTimestamp);
            if (!lockAcquired) {
                
                return "0";
            }
            
            log._vtSending = lockTimestamp;
        } else {
            
            if (log._vtSending && (Date.now() - log._vtSending < 30000)) {
               
                return "0";
            }
            log._vtSending = lockTimestamp;
            lockAcquired = true;
        }

        
        _vtSnPending.push(log);

        __SN_SENDER__.pending.add(log.id);

        
        var hasController = __SN_SUPPORT__.fetch && __SN_SUPPORT__.abortController;
        var hasKeepalive = __SN_SUPPORT__.keepalive; 

        
        var remainingAttempts = __SN_SENDER__.maxAttempts - persistedAttempts;
        if (remainingAttempts <= 0) {
            
            log._vtDead = true;
            clearedDeadAfterExhausted = true;
            if (__SN_SUPPORT__.indexedDB) {
                try {
                    log._vtSending = undefined; 
                    await saveLogToDB(log);
                } catch (_) {}
            }
            __SN_SENDER__.pending.delete(log.id);
            _vtSnPending = _vtSnPending.filter(function(item) { return item.id !== log.id; });
            return "0";
        }

        var attempt = 0;
        var finalResult = "0";
        var canContinue = true;

        
        try {
            while (canContinue && attempt < remainingAttempts) {
                attempt++;
                log.attempts = persistedAttempts + attempt;

                var controller, timer;
                var fetchOpts = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-referrer": location.href,
                        "X-log-id": log.id || ""
                    },
                    body: JSON.stringify(log)
                };

                if (hasController) {
                    controller = new AbortController();
                    fetchOpts.signal = controller.signal;
                    timer = setTimeout(function() { controller.abort(); }, __SN_SENDER__.timeout);
                }
                if (useKeepalive && hasKeepalive) {
                    fetchOpts.keepalive = true;
                }

                try {
                    var respText;
                    if (!__SN_SUPPORT__.fetch) {
                        respText = await _vtSnSendByXHR(log);
                    } else {
                        var res = await fetch("/vt/sn", fetchOpts);
                        if (timer) clearTimeout(timer);
                        if (!res.ok) {
                            throw new Error("HTTP " + res.status + " " + res.statusText);
                        }
                        respText = await res.text();
                    }

                    var serverId = respText;
                    if (!serverId || serverId === "0") {
                        throw new Error("");
                    }

                   
                    sessionStorage.setItem("sendserverId", serverId);
                    finalResult = serverId;
                    canContinue = false;

                } catch (err) {
                    if (timer) clearTimeout(timer);

                    var isTimeout = err.name === "AbortError" || /timeout/i.test(err.message || "");
                    var isNetwork = err instanceof TypeError || /network error/i.test(err.message || "");
                    var is5xx = err.message && /^HTTP 5/.test(err.message);
                    var isRetriable = isTimeout || isNetwork || is5xx;

                    var errInfo = JSON.stringify({
                        time: new Date().toISOString(),
                        logId: log.id,
                        attempt: log.attempts,
                        type: isTimeout ? "timeout" : isNetwork ? "network" : "http",
                        msg: err.message || String(err)
                    });
                    try { sessionStorage.setItem("error", errInfo); } catch (_) {}

                    
                    if (__SN_SUPPORT__.indexedDB) {
                        try { await saveLogToDB(log); } catch (_) {}
                    }

                    var haveMoreAttempts = attempt < remainingAttempts;

                    if (isRetriable && haveMoreAttempts) {
                        
                        var delay = Math.pow(2, attempt - 1) * __SN_SENDER__.baseDelay + Math.random() * 500;
                        
                        await new Promise(function(r) { setTimeout(r, delay); });
                        
                        continue;
                    }

                    
                
                    log._vtDead = true;
                    clearedDeadAfterExhausted = true;
                    canContinue = false;
                }
            }
        } finally {
            
            __SN_SENDER__.pending.delete(log.id);
            _vtSnPending = _vtSnPending.filter(function(item) { return item.id !== log.id; });

            if (__SN_SUPPORT__.indexedDB) {
                if (finalResult && finalResult !== "0") {
                    
                    log.i = finalResult;
                    log._vtSending = undefined;
                    try { await saveLogToDB(log); } catch (_) {}
                    try { await deleteLogFromDB(log.id); } catch (_) {}
                    
                } else {
                    
                    await releaseVtLock(log.id);
                }
            }
        }

        return finalResult;
    }

    
    function flushPendingWithBeacon() {
        if (_vtSnPending.length === 0) return;
        var logs = _vtSnPending.slice(); 
        
        _vtSnPending = [];

        try {
            
            if (__SN_SUPPORT__.sendBeacon) {
                logs.forEach(function(log) {
                    try {
                        var blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
                        navigator.sendBeacon("/vt/sn", blob);
                    } catch (e) {  }
                });
            } else if (__SN_SUPPORT__.fetch) {
                
                logs.forEach(function(log) {
                    var opts = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(log)
                    };
                    if (__SN_SUPPORT__.keepalive) opts.keepalive = true;
                    fetch("/vt/sn", opts).catch(function() {});
                });
            } else if (__SN_SUPPORT__.xhr) {
                
                logs.forEach(function(log) {
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", "/vt/sn", false); 
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.send(JSON.stringify(log));
                    } catch (e) {  }
                });
            }
           
        } catch (_) {}
    }


    function _vtUSendByXHR(log) {
        return new Promise(function(resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", "/vt/u", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("X-referrer", location.href);
                xhr.timeout = __SN_SENDER__.timeout;
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error("HTTP " + xhr.status + " " + xhr.statusText));
                    }
                };
                xhr.onerror = function() { reject(new TypeError("XHR network error")); };
                xhr.ontimeout = function() { reject(new Error("XHR timeout")); };
                xhr.send(JSON.stringify(log));
            } catch (e) { reject(e); }
        });
    }

    async function updateLogToServer(log, options) {
        options = options || {};
        var retries = options.retries || 0;
        var timeout = options.timeout || __SN_SENDER__.timeout;
        var maxRetry = options.maxRetry !== undefined ? options.maxRetry : 3;

        
        if (!__SN_SUPPORT__.fetch && !__SN_SUPPORT__.xhr) {
            
            return "-1";
        }

        
        var offlineChecked = __SN_SUPPORT__.onlineEvent && typeof navigator.onLine !== "undefined";
        if (offlineChecked && !navigator.onLine) {
            
            return "-1";
        }

        try {
            var controller, timer;
            var hasController = __SN_SUPPORT__.fetch && __SN_SUPPORT__.abortController;
            var hasKeepalive = __SN_SUPPORT__.keepalive;

            var opts = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-referrer": location.href
                },
                body: JSON.stringify(log)
            };

            if (hasController) {
                controller = new AbortController();
                opts.signal = controller.signal;
                timer = setTimeout(function() { controller.abort(); }, timeout);
            }
            if (hasKeepalive) opts.keepalive = true;

            var respText;
            if (!__SN_SUPPORT__.fetch) {
                respText = await _vtUSendByXHR(log);
            } else {
                var res = await fetch("/vt/u", opts);
                if (timer) clearTimeout(timer);
                if (!res.ok) {
                    throw new Error("HTTP " + res.status + " " + res.statusText);
                }
                respText = await res.text();
            }

            return respText;

        } catch (err) {
            if (timer) clearTimeout(timer);

            var isTimeout = err.name === "AbortError" || /timeout/i.test(err.message || "");
            var isNetwork = err instanceof TypeError || /network error/i.test(err.message || "");
            var is5xx = err.message && /^HTTP 5/.test(err.message);
            var canRetry = (isTimeout || isNetwork || is5xx) && retries < maxRetry;

            var errInfo = JSON.stringify({
                time: new Date().toISOString(),
                logId: log && log.id,
                attempt: retries + 1,
                type: isTimeout ? "timeout" : isNetwork ? "network" : "http",
                msg: err.message || String(err)
            });
            try { sessionStorage.setItem("vt_u_error", errInfo); } catch (_) {}

            if (canRetry) {
                var delay = Math.pow(2, retries) * __SN_SENDER__.baseDelay + Math.random() * 300;
                
                await new Promise(function(r) { setTimeout(r, delay); });
                return updateLogToServer(log, { keepalive: false, retries: retries + 1, timeout: timeout, maxRetry: maxRetry });
            }

            
            return "-1";
        }
    }
    async function deleteLogFromDB(id) {
        const tx = (await openDB()).transaction("logs", "readwrite");
        return tx.objectStore("logs").delete(id),
        new Promise( (resolve, reject) => {
            tx.oncomplete = () => resolve(),
            tx.onerror = e => reject(e)
        }
        )
    }

    
    var __SN_RESYNCING__ = false; 
    var __SN_MAX_RESYNC__ = 10;  
    async function resyncStoredLogs() {
        if (!__SN_SUPPORT__.indexedDB) return;
        if (__SN_RESYNCING__) {
          
            return;
        }
        if (__SN_SUPPORT__.onlineEvent && typeof navigator.onLine !== "undefined" && !navigator.onLine) {
           
            return;
        }

        __SN_RESYNCING__ = true;
        try {
            var store = (await openDB()).transaction("logs", "readonly").objectStore("logs");
            var allLogs = await new Promise(function(resolve, reject) {
                var req = store.getAll();
                req.onsuccess = function() { resolve(req.result || []); };
                req.onerror = function(e) { reject(e); };
            });

            if (!allLogs.length) {
                
                return;
            }

            var replayed = 0;
            var failed = 0;
            var skipped = 0;
            for (var i = 0; i < allLogs.length; i++) {
                var log = allLogs[i];
                try {
                    
                    if (log.i && log.i !== "0") { skipped++; continue; }

                    
                    if (log._vtSending && (Date.now() - log._vtSending < 30000)) {
                        skipped++;
                        continue;
                    }

                    
                    if (log._vtDead) { skipped++; continue; }
                    if (typeof log.attempts === "number" && log.attempts >= __SN_SENDER__.maxAttempts) {
                        log._vtDead = true;
                        try { await saveLogToDB(log); } catch (_) {}
                        skipped++;
                        continue;
                    }

                    
                    if (replayed + failed >= __SN_MAX_RESYNC__) {
                        skipped += (allLogs.length - i);
                        break;
                    }

                    var id = await sendLogToServer(log);
                    if (id && id !== "0") {
                        
                        replayed++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    failed++;
                 
                }
            }
            
        } catch (e) {
            
        } finally {
            __SN_RESYNCING__ = false;
        }
    }

    const Snowflake = ( () => {
        let lastTimestamp = -1
          , sequence = 0;
        function timeGen() {
            return Date.now()
        }
        return {
            nextId: function() {
                let timestamp = timeGen();
                if (timestamp < lastTimestamp)
                    throw new Error("");
                return lastTimestamp === timestamp ? (sequence = sequence + 1 & 4095,
                0 === sequence && (timestamp = function(lastTs) {
                    let ts = timeGen();
                    for (; ts <= lastTs; )
                        ts = timeGen();
                    return ts
                }(lastTimestamp))) : sequence = 0,
                lastTimestamp = timestamp,
                (BigInt(timestamp - 16094592e5) << BigInt(22) | BigInt(1) << BigInt(17) | BigInt(1) << BigInt(12) | BigInt(sequence)).toString()
            }
        }
    }
    )();
    let __BROWSER_UID__ = null;
    function openIdDB() {
        return new Promise( (resolve, reject) => {
            const request = indexedDB.open("UniqueIdDB", 1);
            request.onerror = e => reject(e),
            request.onsuccess = e => resolve(e.target.result),
            request.onupgradeneeded = e => {
                const db = e.target.result;
                db.objectStoreNames.contains("BrowserIdStore") || db.createObjectStore("BrowserIdStore", {
                    keyPath: "id"
                })
            }
        }
        )
    }
    function getBrowserUid() {
        if (__BROWSER_UID__)
            return __BROWSER_UID__;
        return (async () => {
            let id = await async function() {
                const store = (await openIdDB()).transaction("BrowserIdStore", "readonly").objectStore("BrowserIdStore");
                return new Promise( (resolve, reject) => {
                    const request = store.get("unique_long_id");
                    request.onsuccess = e => {
                        const result = e.target.result;
                        resolve(result ? result.value : null)
                    }
                    ,
                    request.onerror = e => reject(e)
                }
                )
            }();
            return id || (id = Snowflake.nextId().toString(),
            await async function(id) {
                (await openIdDB()).transaction("BrowserIdStore", "readwrite").objectStore("BrowserIdStore").put({
                    id: "unique_long_id",
                    value: id
                })
            }(id)),
            __BROWSER_UID__ = id,
            id
        }
        )()
    }
    function getDeviceInfo() {
        const ua = navigator.userAgent
          , vendor = navigator.vendor;
        let os = "Unknown"
          , deviceType = "PC"
          , browser = "Unknown"
          , version = "";
        return /Windows NT 10/.test(ua) ? os = "Windows 10" : /Windows NT 11/.test(ua) ? os = "Windows 11" : /Mac OS X/.test(ua) ? os = "MacOS" : /iPhone|iPad|iPod/.test(ua) ? os = "iOS" : /Android/.test(ua) && (os = "Android"),
        /Mobi|Android|iPhone|iPad/i.test(ua) && (deviceType = /Android/.test(ua) ? "Mobile-Android" : "Mobile-iOS"),
        !function() {
            const ua360 = ua.includes("QIHU") || ua.includes("360SE") || ua.includes("360EE") || ua.includes("360Browser")
              , vendor360 = vendor && vendor.toLowerCase().includes("qihoo")
              , mime360 = function(option, value) {
                const mimeTypes = navigator.mimeTypes;
                for (let mt in mimeTypes)
                    if (mimeTypes[mt][option] == value)
                        return !0;
                return !1
            }("type", "application/vnd.chromium.remoting-viewer");
            return /Chrome/.test(ua) && (ua360 || vendor360 || mime360)
        }() ? /QQBrowser/.test(ua) ? (browser = "QQ Browser",
        version = ua.match(/QQBrowser\/([\d.]+)/)?.[1] || "") : /UBrowser/.test(ua) ? (browser = "UC Browser",
        version = ua.match(/UBrowser\/([\d.]+)/)?.[1] || "") : /MetaSr/.test(ua) ? browser = "Sogou Browser" : /Edg\//.test(ua) ? (browser = "Edge",
        version = ua.match(/Edg\/([\d.]+)/)[1]) : /Chrome\//.test(ua) ? (browser = "Chrome",
        version = ua.match(/Chrome\/([\d.]+)/)[1]) : /Firefox\//.test(ua) ? (browser = "Firefox",
        version = ua.match(/Firefox\/([\d.]+)/)[1]) : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? (browser = "Safari",
        version = ua.match(/Version\/([\d.]+)/)?.[1] || "") : /Trident\//.test(ua) && (browser = "IE",
        version = ua.match(/rv:([\d.]+)/)[1]) : browser = "360 Browser",
        {
            ua: ua,
            os: os,
            deviceType: deviceType,
            browser: browser,
            version: version
        }
    }
    let enterTime = Date.now()
      , currentUrl = location.href
      , currentLogId = sessionStorage.getItem(CURRENT_ID_KEY);
    performance.now();

    
    async function createEnterLog(url, from, reason, extra) {
        enterTime = Date.now(),
        currentUrl = url;
        const id = Date.now() + "_" + Math.random().toString(36).slice(2, 9);
        currentLogId = id;
        const device = getDeviceInfo();
        let dowloadFlag = !0;
        const keyId = await getBrowserUid();
      
        url.includes("/search/") && (reason = "search",
        extra = url.match(/\/search\/(\d+)\.html$/)?.[1] ?? ""),
        "download" == reason && (dowloadFlag = await async function(url, timeout=3e3) {
            const fullUrl = /^https?:\/\//i.test(url) ? url : new URL(url,window.location.origin).href
              , controller = new AbortController
              , id = setTimeout( () => controller.abort(), timeout);
            try {
                const res = await fetch(fullUrl, {
                    method: "HEAD",
                    signal: controller.signal
                });
                return clearTimeout(id),
                res.ok
            } catch {
                return clearTimeout(id),
                !1
            }
        }(extra, 3e3),
        dowloadFlag || (url = extra));
        let t = 1;
        if (t = "search" == reason ? 4 : "download" == reason ? 2 : "leave" == reason ? 3 : "im" == reason ? 5 : "im_inquiry" == reason ? 6 : "layim" == reason ? 7 : 1,
        url.includes("/uploads/") && "view" == reason)
            return;
        let title = document.title;
        4 == t && (title = sessionStorage.getItem("page_track_location_title_url") || document.title);
        const metaTag = document.querySelector('meta[property="og:type"]')
          , contentValue = metaTag ? metaTag.getAttribute("content") : null
          , log = {
            ua: device.ua,
            id: id,
            l: from || "",
            u: url,
            t: t,
            og: contentValue,
            tl: title,
            enterAt: new Date(enterTime).toISOString(),
            leaveAt: null,
            stm: 0,
            leaveReason: reason || null,
            os: device.os,
            dt: device.deviceType,
            bws: device.browser,
            bv: device.version,
            ttm: 0,
            ex: extra || null,
            k: keyId,
            upt: 0,
            i: "",
            attempts: 0,
            _vtDead: false        
        };
        sessionStorage.setItem(LAST_URL_KEY, url),
        sessionStorage.setItem("page_track_location_title_url", document.title),
        sessionStorage.setItem("page_track_from_url_key", from);

        
        await saveLogToDB(log);

        if (reason === "view" || reason === "search") {
            sessionStorage.setItem(CURRENT_ID_KEY, id);
        } else {
            
            sendLogToServer(log).catch(function() {});
        }
    }

    async function updatePageLoadMetrics() {
        const id = sessionStorage.getItem(CURRENT_ID_KEY) || currentLogId;
        if (!id)
            return;
        const store = (await openDB()).transaction("logs", "readonly").objectStore("logs")
          , localLog = await new Promise( (resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result),
            req.onerror = e => reject(e)
        }
        );
        if (!localLog)
            return;
        const entries = performance.getEntriesByType("navigation")
          , timings = entries?.[0] ? {
            ttfb: Math.round(entries[0].responseStart - entries[0].requestStart),
            contentDownload: Math.round(entries[0].responseEnd - entries[0].responseStart)
        } : {
            ttfb: 0,
            contentDownload: 0
        };
        localLog.ttm = timings.ttfb + timings.contentDownload,
        localLog.ttm < 0 && (localLog.ttm = 0);

        
        var serverId;
        if (localLog.i && localLog.i !== "0") {
          
            serverId = localLog.i;
        } else {
            serverId = await sendLogToServer(localLog);
        }

        sessionStorage.setItem("serverId", serverId);

        if (serverId && serverId !== "0") {
            localLog.i = serverId;
        }
        lastActiveLog = { ...localLog };
        await saveLogToDB(localLog);

        
        await async function() {
            try {
                const store = (await openDB()).transaction("logs", "readonly").objectStore("logs")
                  , allLogs = await new Promise( (resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []),
                    req.onerror = e => reject(e)
                }
                );
                Date.now();
                let syncCount = 0;
                for (const log of allLogs) {
                    try {
                        const enterTime = Date.parse(log.enterAt);
                        if (!log.i) {
                            if (log._vtDead) continue;
                            if (typeof log.attempts === "number" && log.attempts >= __SN_SENDER__.maxAttempts) {
                                log._vtDead = true;
                                try { await saveLogToDB(log); } catch (_) {}
                                continue;
                            }
                            
                            if (log._vtSending && (Date.now() - log._vtSending < 30000)) {
                                
                                continue;
                            }
                            
                            await sendLogToServer(log);
                            continue;
                        }
                        if (!enterTime)
                            continue;
                        if (!log.leaveAt)
                            continue;
                        if (log.stm > 0) {
                            var updateRet = await updateLogToServer(log);
                            if (updateRet !== "-1" && updateRet !== "0") {
                                await deleteLogFromDB(log.id);
                                syncCount++;
                            } else {
                                
                            }
                        }
                    } catch (err) {
                       
                    }
                    if (syncCount >= 3)
                        return
                }
            } catch (e) {
                
            }
        }()
    }

    async function updateLeaveLogById(id, reason) {
        if (!lastActiveLog)
            return;
        const leaveTime = Date.now()
          , prevEnter = Date.parse(lastActiveLog.enterAt) || leaveTime;
        lastActiveLog.leaveReason = reason,
        lastActiveLog.leaveAt = new Date(leaveTime).toISOString(),
        lastActiveLog.stm = leaveTime - prevEnter,
        lastActiveLog.upt = 1;

        
        try { await saveLogToDB(lastActiveLog); } catch (_) {}

        var canDeleteLocal = false;
        try {
            if (__SN_SUPPORT__.sendBeacon) {
                try {
                    var blob = new Blob([JSON.stringify(lastActiveLog)], { type: "text/plain;charset=UTF-8" });
                   
                    var queued = navigator.sendBeacon("/vt/un", blob);
                    if (queued) {
                        canDeleteLocal = true;
                    } else {
                        
                    }
                } catch (e) {
                    
                }
            } else if (__SN_SUPPORT__.fetch) {

                var fetchOpts = {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-referrer": location.href },
                    body: JSON.stringify(lastActiveLog)
                };
                if (__SN_SUPPORT__.keepalive) fetchOpts.keepalive = true;

                fetch("/vt/u", fetchOpts).then(function(res) {
                    if (res && res.ok) {
                        try { deleteLogFromDB(lastActiveLog.id); } catch (_) {}
                    }
                }).catch(function() {});
  
            } else if (__SN_SUPPORT__.xhr) {

                try {
                    var sxhr = new XMLHttpRequest();
                    sxhr.open("POST", "/vt/u", false); 
                    sxhr.setRequestHeader("Content-Type", "application/json");
                    sxhr.setRequestHeader("X-referrer", location.href);
                    sxhr.send(JSON.stringify(lastActiveLog));
                    if (sxhr.status >= 200 && sxhr.status < 300) {
                        canDeleteLocal = true;
                    }
                } catch (e) {
                   
                }
            }
        
        } catch (err) {
           
        }

        if (canDeleteLocal) {
            try { await deleteLogFromDB(lastActiveLog.id); } catch (_) {}
        } else {
            
        }
    }

    function handleLeave(reason) {
        if (leaveHandled) return;
        leaveHandled = true;
        flushPendingWithBeacon();

        updateLeaveLogById(sessionStorage.getItem(CURRENT_ID_KEY), reason);
        sessionStorage.removeItem(CURRENT_ID_KEY)
    }

    document.addEventListener("click", e => {
        const link = e.target.closest("a");
        if (!link)
            return;
        const isDownloadAttr = link.hasAttribute("download")
          , isFileExtension = /\.(zip|rar|7z|pdf|docx?|xlsx?|pptx?|csv|jpg|png|mp3|mp4|xml)$/i.test(link.pathname);
        if (isDownloadAttr || isFileExtension) {
            e.preventDefault();
            const navEntries = performance.getEntriesByType("navigation");
            createEnterLog(navEntries.length > 0 ? navEntries[0].name : location.href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || location.href, "download", link.href),
            setTimeout( () => {
                window.location.href = link.href
            }
            , 100)
        }
    }
    ),
    document.addEventListener("click", e => {
        try {
            const navEntries = performance.getEntriesByType("navigation")
              , location_href = navEntries.length > 0 ? navEntries[0].name : location.href;
            if (e.target.closest("img"))
                return;
            const shareBtn = e.target.closest(".share-btn");
            if (shareBtn) {
                const type = shareBtn.dataset.type
                  , shareUrl = function(type) {
                    const navEntries = performance.getEntriesByType("navigation")
                      , location_href = navEntries.length > 0 ? navEntries[0].name : location.href
                      , page = {
                        url: location_href,
                        title: document.title,
                        origin: location.origin,
                        description: document.querySelector('meta[name="description"]')?.content || "",
                        source: location.hostname,
                        image: document.querySelector('meta[property="og:image"]')?.content || ""
                    }
                      , whatsappweb = window.innerWidth <= 768 ? "https://api.whatsapp.com" : "https://web.whatsapp.com";
                    switch (type) {
                    case "facebook":
                        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(page.url)}`;
                    case "twitter":
                        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(page.title)}&url=${encodeURIComponent(page.url)}`;
                    case "linkedin":
                        return `https://www.linkedin.com/shareArticle?mini=true&title=${encodeURIComponent(page.title)}&url=${encodeURIComponent(page.url)}&summary=${encodeURIComponent(page.description)}`;
                    case "whatsapp":
                        return `${whatsappweb}/send?text=${encodeURIComponent(page.url)}`;
                    case "pinterest":
                        return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(page.url)}&description=${encodeURIComponent(page.description)}`;
                    default:
                        return ""
                    }
                }(type);
                return void (shareUrl ? (createEnterLog(location_href, location_href, "leave", shareUrl),
                console.log( type, shareUrl)) : console.warn( type))
            }
            const link = e.target.closest("a");
            if (!link || !link.href)
                return;
            if (link.querySelector('span[class*="lang-"]'))
                return;
            const linkherf = link.href;
            if ("javascript:;" == linkherf || "javascript:void(0);" == linkherf || "javascript:void(0)" == linkherf)
                return;
            const urlPath = new URL(link.href,location_href).pathname.toLowerCase()
              , downloadExts = [".zip", ".rar", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".exe"];
            if (link.hasAttribute("download") || downloadExts.some(ext => urlPath.endsWith(ext)))
                return;
            const targetUrl = new URL(link.href,location_href)
              , currentDomain = location.hostname.split(".").slice(-2).join(".")
              , isDifferentDomain = targetUrl.hostname.split(".").slice(-2).join(".") !== currentDomain
              , isNewWindow = link.target && "" !== link.target.trim();
            if (isDifferentDomain || isNewWindow) {
                createEnterLog(location_href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "", "leave", link.href)
            }
        } catch (err) {
            
        }
    }
    ),
    document.addEventListener("click", e => {
        const imBox = e.target.closest(".GdImMiniBox");
        if (!imBox)
            return;
        const navEntries = performance.getEntriesByType("navigation");
        createEnterLog(navEntries.length > 0 ? navEntries[0].name : location.href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "", imBox.classList.contains("isAct") || imBox.querySelector(".imbtn-icon") ? "im" : "im_inquiry", "")
    }
    ),
    document.addEventListener("click", e => {
        if (!e.target.closest(".LayImAhrefNode"))
            return;
        const navEntries = performance.getEntriesByType("navigation");
        createEnterLog(navEntries.length > 0 ? navEntries[0].name : location.href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "", "layim", "")
    }
    );
    const oldPost = $.post;
    $.post = function(url, data, callback, type) {
        if (url.includes("/o/CheckEmail_Download")) {
            const wrappedCb = function(RetObj) {
                if (RetObj && 1 == RetObj.IsSuccess && RetObj.Href) {
               
                    const navEntries = performance.getEntriesByType("navigation");
                    createEnterLog(navEntries.length > 0 ? navEntries[0].name : location.href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "", "download", RetObj.Href)
                }
                return callback && callback(RetObj)
            };
            return oldPost.call(this, url, data, wrappedCb, type)
        }
        return oldPost.call(this, url, data, callback, type)
    }
    ;
    const newPost = $.post;
    function mountDebugHelpers() {
        window.viewPageLogs = () => {
            const logs = function() {
                try {
                    return JSON.parse(localStorage.getItem("page_track_log")) || []
                } catch {
                    return []
                }
            }();
            return console.table(logs),
            logs
        }
        ,
        window.clearPageLogs = () => {
          localStorage.removeItem("page_track_log")
          sessionStorage.removeItem(CURRENT_ID_KEY)
          sessionStorage.removeItem(LAST_URL_KEY)
        }
    }
    $.post = function(url, data, callback, type) {
        if (url.includes("/o/CheckPassword_Download")) {
            const wrappedCb = function(RetObj) {
                if (RetObj && 1 == RetObj.IsSuccess && RetObj.Href) {
                    const navEntries = performance.getEntriesByType("navigation");
                    createEnterLog(navEntries.length > 0 ? navEntries[0].name : location.href, sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "", "download", RetObj.Href)
                }
                return callback && callback(RetObj)
            };
            return newPost.call(this, url, data, wrappedCb, type)
        }
        return newPost.call(this, url, data, callback, type)
    }
    ,
    window.addEventListener("DOMContentLoaded", () => {
        const navEntries = performance.getEntriesByType("navigation")
          , location_href = navEntries.length > 0 ? navEntries[0].name : location.href
          , initialFrom = sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "";
        sessionStorage.removeItem("page_track_from_url_key"),
        sessionStorage.removeItem(LAST_URL_KEY),
        sessionStorage.removeItem("page_track_location_title_url"),
        setTimeout( () => {
            createEnterLog(location_href, initialFrom, "view")
        }
        , 100),
        setTimeout( () => {
            updatePageLoadMetrics()
        }
        , 1e3)
    }
    ),
    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            leaveHandled = false;
        }
        const currentUrl = location.href
          , fromUrl = sessionStorage.getItem(LAST_URL_KEY) || document.referrer || "";
        sessionStorage.getItem("upload_key");
        (performance.navigation.type === performance.navigation.TYPE_BACK_FORWARD || event.persisted) && (setTimeout( () => {
            currentUrl.includes("/uploads/") ? createEnterLog(location.href, fromUrl, "download", location.href) : createEnterLog(location.href, fromUrl, "view")
        }
        , 2e3),
        sessionStorage.removeItem(LAST_URL_KEY))
    }
    ),
    window.addEventListener("pagehide", function() { handleLeave("pagehide"); }),
    window.addEventListener("beforeunload", function() { handleLeave("beforeunload"); }),
    __SN_SUPPORT__.onlineEvent && window.addEventListener("online", function() {
        setTimeout(function() {
            resyncStoredLogs().catch(function(err) {
            });
        }, 300);
    }),
    mountDebugHelpers(),
    window.addEventListener("pageshow", function() { mountDebugHelpers(); })
}();