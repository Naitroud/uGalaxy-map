/* build 2026-11-18c */
'use strict';
(() => {
    const node = document.getElementById('galaxy-data'),
    fallback = JSON.parse(node.textContent),
    root = new URL('../', document.currentScript.src),
    keys = ['systems', 'events', 'fleets', 'groups', 'commanders', 'territories', 'meta'];
    window.GalDataReady = (async() => {
        let data = fallback;
        try {
            const parts = await Promise.all(keys.map(async key => {
                        const response = await fetch(new URL('assets/galaxy/' + key + '.json', root), {
                            cache: 'no-store'
                        });
                        if (!response.ok)
                            throw Error(key + ': ' + response.status);
                        return response.json();
                    }));
            const files = Object.fromEntries(keys.map((key, i) => [key, parts[i]]));
            for (const key of keys.slice(0, 5))
                if (!Array.isArray(files[key]))
                    throw Error('Invalid ' + key);
            if (!files.meta || typeof files.meta !== 'object' || Array.isArray(files.meta))
                throw Error('Invalid metadata');
            data = {
                ...files.meta,
                ...Object.fromEntries(keys.slice(0, 6).map(key => [key, files[key]]))
            };
            window.GalaxyDataSource = 'external';
        } catch (error) {
            window.GalaxyDataSource = 'embedded';
            window.GalaxyDataLoadError = String(error);
            if (location.protocol !== 'file:')
                console.warn('Galaxy JSON unavailable; using complete embedded fallback.', error);
        }
        node.textContent = JSON.stringify(data);
        window.GalaxyPublishedBase = JSON.parse(JSON.stringify(data));
        return data;
    })();
    window.GalDataReady.then(() => {
        const script = document.createElement('script');
        script.src = new URL('assets/app.js', root).href;
        script.onerror = () => console.error('Unable to load galaxy application bundle');
        document.body.append(script);
    });
    /* ==== ДОБАВЛЕНО: индикатор источника данных (только точка на месте status-dot). Выше — исходный код без изменений. ==== */
    const draftKeys = ['ugalaxy-draft-v7', 'ugalaxy-draft-v6', 'ugalaxy-draft-v4'];
    const dotStyle = document.createElement('style');
    dotStyle.textContent =
        'footer.bottom-bar .status-dot{width:7px;height:7px;cursor:pointer;transition:background .2s,box-shadow .2s}' +
        'footer.bottom-bar .status-dot[data-state="loading"]{background:#5a6c7c;box-shadow:0 0 8px #5a6c7c60}' +
        'footer.bottom-bar .status-dot[data-state="external"]{background:#78dfea;box-shadow:0 0 8px #78dfea60}' +
        'footer.bottom-bar .status-dot[data-state="embedded"]{background:#ffb66a;box-shadow:0 0 8px #ffb66a60}' +
        'footer.bottom-bar .status-dot[data-state="draft"]{background:#59d68f;box-shadow:0 0 8px #59d68f60}';
    let dotEl = null,
    tries = 0;
    function findStatusDot() {
        const footer = document.querySelector('footer.bottom-bar');
        if (!footer)
            return null;
        return footer.querySelector('.status-dot');
    }
    function embed() {
        if (dotEl && !dotEl.isConnected)
            dotEl = null;
        if (!dotEl)
            dotEl = findStatusDot();
        if (document.head && !dotStyle.isConnected)
            document.head.append(dotStyle);
        if (!dotEl) {
            if (tries++ < 60)
                setTimeout(embed, 300);
            return;
        }
        dotEl.dataset.state = 'loading';
        const brand = dotEl.closest('span');
        if (brand)
            brand.setAttribute('aria-live', 'polite');
        render();
    }
    function activeDraftKey() {
        for (const key of draftKeys) {
            try {
                if (localStorage.getItem(key) !== null)
                    return key;
            } catch (error) {}
        }
        return null;
    }
    function render() {
        let state,
        title;
        const dk = activeDraftKey();
        if (dk) {
            state = 'draft';
            title = 'Локальный черновик редактора (' + dk + ') перекрывает опубликованные данные. Клик — вывести черновик в консоль.';
        } else if (!window.GalaxyDataSource) {
            state = 'loading';
            title = 'Идёт загрузка данных…';
        } else if (window.GalaxyDataSource === 'external') {
            state = 'external';
            title = 'Данные загружены из assets/galaxy/*.json. Клик — подробности в консоли.';
        } else {
            state = 'embedded';
            title = 'Внешние JSON недоступны, работает встроенный резерв. Причина: ' + (window.GalaxyDataLoadError || 'неизвестна') + '. Клик — подробности в консоли.';
        }
        if (!dotEl || !dotEl.isConnected)
            return;
        dotEl.dataset.state = state;
        dotEl.title = title;
        dotEl.setAttribute('aria-label', title);
    }
    document.addEventListener('click', event => {
        if (!dotEl || event.target !== dotEl)
            return;
        const dk = activeDraftKey();
        if (dk) {
            try {
                console.info('[Голокарта] Локальный черновик (' + dk + '):', JSON.parse(localStorage.getItem(dk)));
            } catch (error) {
                console.info('[Голокарта] Черновик (' + dk + ') не читается:', error);
            }
            return;
        }
        if (window.GalaxyDataSource === 'external')
            console.info('[Голокарта] Источник: внешние файлы assets/galaxy/*.json.');
        else
            console.info('[Голокарта] Источник: встроенный резерв. Причина fallback:', window.GalaxyDataLoadError);
    });
    document.addEventListener('galaxy-data-changed', render);
    window.addEventListener('storage', event => {
        if (event.key === null || draftKeys.includes(event.key))
            render();
    });
    embed();
    render();
    window.GalDataReady.then(() => {
        render();
        // Подстраховка: черновик применяется в app.js после загрузки бандла — перепроверяем ещё несколько раз
        setTimeout(render, 400);
        setTimeout(render, 1500);
        setTimeout(render, 4000);
    });
})();
