(function () {
    const r = window.RESTAURANT || {};
    const slug = r.slug || 'family';
    const id = r.id;
    if (!id) {
        console.error('RESTAURANT.id жок — меню туура жükтөлбөйт');
    }

    window.restaurantBase = r.base || ('/r/' + slug);
    window.restaurantSlug = slug;
    window.restaurantId = id;

    localStorage.setItem('restaurantId', String(id));

    window.cartStorageKey = function () {
        return 'cart:' + slug;
    };

    window.orderCommentKey = function () {
        return 'orderComment:' + slug;
    };

    window.getStoredCart = function () {
        try {
            const raw = localStorage.getItem(cartStorageKey());
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map(function (item) {
                    return {
                        ...item,
                        quantity: Math.max(0, Math.round(Number(item.quantity || 0)))
                    };
                })
                .filter(function (item) {
                    return item.quantity > 0;
                });
        } catch (e) {
            return [];
        }
    };

    window.saveStoredCart = function (cart) {
        localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
    };

    window.getStoredComment = function () {
        return localStorage.getItem(orderCommentKey()) || '';
    };

    window.saveStoredComment = function (value) {
        localStorage.setItem(orderCommentKey(), String(value || '').trim());
    };

    window.rUrl = function (path) {
        if (!path || path === '/') {
            return restaurantBase;
        }
        const p = path.charAt(0) === '/' ? path : '/' + path;
        return restaurantBase + p;
    };
})();
